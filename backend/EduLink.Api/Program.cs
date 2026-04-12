using EduLink.Application.Services;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using System.Text;
using Hangfire;
using Hangfire.PostgreSql;
using CloudinaryDotNet;
using EduLink.Api.Hubs;
using EduLink.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

// ─── Database ─────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsql => npgsql.UseVector()
    ));

// ─── Redis ────────────────────────────────────────────────────────────────
var redisConnStr = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
// Strip redis:// prefix if present (StackExchange.Redis does not accept URI format)
redisConnStr = redisConnStr.Replace("redis://", "").Replace("rediss://", "");
var redisConfig = ConfigurationOptions.Parse(redisConnStr);
redisConfig.AbortOnConnectFail = false;
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(redisConfig));

// ─── JWT Auth ─────────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is required");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
        // Support SignalR auth via query string
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var accessToken = ctx.Request.Query["access_token"];
                var path = ctx.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    ctx.Token = accessToken;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly",   p => p.RequireRole("Admin"));
    options.AddPolicy("TeacherOnly", p => p.RequireRole("Teacher"));
    options.AddPolicy("ParentOnly",  p => p.RequireRole("Parent"));
    options.AddPolicy("AdminOrTeacher", p => p.RequireRole("Admin", "Teacher"));
});

// ─── CORS ─────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

// ─── SignalR ──────────────────────────────────────────────────────────────
builder.Services.AddSignalR()
    .AddStackExchangeRedis(redisConnStr); // Redis backplane for scale-out

// ─── Cloudinary ───────────────────────────────────────────────────────────
var cloudinaryAccount = new Account(
    builder.Configuration["Cloudinary:CloudName"],
    builder.Configuration["Cloudinary:ApiKey"],
    builder.Configuration["Cloudinary:ApiSecret"]
);
builder.Services.AddSingleton(new Cloudinary(cloudinaryAccount));

// ─── Application Services ────────────────────────────────────────────────
builder.Services.Configure<SmsOptions>(builder.Configuration.GetSection("Sms"));
builder.Services.AddSingleton<MockSmsService>();
builder.Services.AddHttpClient<ProviderSmsService>();
builder.Services.AddScoped<ISmsService>(sp =>
{
    var options = sp.GetRequiredService<IOptions<SmsOptions>>().Value;
    var mode = options.Mode?.Trim();
    if (string.Equals(mode, "Provider", StringComparison.OrdinalIgnoreCase))
        return sp.GetRequiredService<ProviderSmsService>();

    return sp.GetRequiredService<MockSmsService>();
});
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<CloudinaryService>();
builder.Services.AddScoped<AiService>();
builder.Services.AddHttpClient<AiService>(client =>
{
    client.BaseAddress = new Uri(
        builder.Configuration["AiService:BaseUrl"] ?? "http://ai-service:8000");
    client.DefaultRequestHeaders.Add(
        "X-Api-Key",
        builder.Configuration["AiService:ApiKey"] ?? "");
});
builder.Services.AddHttpContextAccessor();

// ─── Hangfire ─────────────────────────────────────────────────────────────
builder.Services.AddHangfire(config =>
    config.UsePostgreSqlStorage(c =>
        c.UseNpgsqlConnection(
            builder.Configuration.GetConnectionString("DefaultConnection"))));
builder.Services.AddHangfireServer();

// ─── Controllers + Swagger ────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "EduLink API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                    { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// ─── Auto Migrate + Seed ──────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    // ── Platform school: single anchor for platform admin ────────────────
    var platformSchoolId = Guid.Parse("FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF");
    if (!db.Schools.Any(s => s.Id == platformSchoolId))
    {
        db.Schools.Add(new EduLink.Domain.Entities.School
        {
            Id = platformSchoolId,
            Name = "Notio Platform",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        db.SaveChanges();
    }

    // ── Platform admin user ──────────────────────────────────────────────
    if (!db.Users.Any(u => u.Email == "admin@edulink.com"))
    {
        db.Users.Add(new EduLink.Domain.Entities.User
        {
            Id = Guid.NewGuid(),
            FullName = "Admin Kullanıcı",
            Email = "admin@edulink.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            Role = EduLink.Domain.Enums.UserRole.Admin,
            SchoolId = platformSchoolId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        db.SaveChanges();
    }
    else
    {
        // Ensure admin is on platform school (not a demo school)
        var adminUser = db.Users.First(u => u.Email == "admin@edulink.com");
        if (adminUser.SchoolId != platformSchoolId)
        {
            adminUser.SchoolId = platformSchoolId;
            db.SaveChanges();
        }
    }

    // ── One-time cleanup: remove demo schools and test users ─────────────
    var demoSchoolIds = new[]
    {
        Guid.Parse("00000000-0000-0000-0000-000000000001"),
        Guid.Parse("11111111-1111-1111-1111-111111111111"),
    };
    var hasDemoSchools = db.Schools.Any(s => demoSchoolIds.Contains(s.Id));
    if (hasDemoSchools)
    {
        // Delete in dependency order to satisfy FK Restrict constraints
        db.Database.ExecuteSqlRaw(@"
            DO $$
            DECLARE demo_ids UUID[] := ARRAY[
                '00000000-0000-0000-0000-000000000001'::UUID,
                '11111111-1111-1111-1111-111111111111'::UUID
            ];
            BEGIN
                -- Messages / Conversations (no school FK, but clean up via users)
                DELETE FROM ""Messages"" WHERE ""SenderId"" IN (
                    SELECT ""Id"" FROM ""Users"" WHERE ""SchoolId"" = ANY(demo_ids));
                DELETE FROM ""ConversationParticipants"" WHERE ""UserId"" IN (
                    SELECT ""Id"" FROM ""Users"" WHERE ""SchoolId"" = ANY(demo_ids));
                DELETE FROM ""Conversations"" WHERE ""Id"" NOT IN (
                    SELECT DISTINCT ""ConversationId"" FROM ""ConversationParticipants"");

                -- Posts and related
                DELETE FROM ""PostStudentTags"" WHERE ""PostId"" IN (
                    SELECT p.""Id"" FROM ""Posts"" p
                    JOIN ""Classes"" c ON c.""Id"" = p.""ClassId""
                    WHERE c.""SchoolId"" = ANY(demo_ids));
                DELETE FROM ""PostMedias"" WHERE ""PostId"" IN (
                    SELECT p.""Id"" FROM ""Posts"" p
                    JOIN ""Classes"" c ON c.""Id"" = p.""ClassId""
                    WHERE c.""SchoolId"" = ANY(demo_ids));
                DELETE FROM ""Posts"" WHERE ""ClassId"" IN (
                    SELECT ""Id"" FROM ""Classes"" WHERE ""SchoolId"" = ANY(demo_ids));

                -- Assignments / Submissions
                DELETE FROM ""Submissions"" WHERE ""AssignmentId"" IN (
                    SELECT a.""Id"" FROM ""Assignments"" a
                    JOIN ""Classes"" c ON c.""Id"" = a.""ClassId""
                    WHERE c.""SchoolId"" = ANY(demo_ids));
                DELETE FROM ""Assignments"" WHERE ""ClassId"" IN (
                    SELECT ""Id"" FROM ""Classes"" WHERE ""SchoolId"" = ANY(demo_ids));

                -- Attendances / DailyReports (via student)
                DELETE FROM ""Attendances"" WHERE ""ClassId"" IN (
                    SELECT ""Id"" FROM ""Classes"" WHERE ""SchoolId"" = ANY(demo_ids));
                DELETE FROM ""DailyReports"" WHERE ""StudentId"" IN (
                    SELECT s.""Id"" FROM ""Students"" s
                    JOIN ""Classes"" c ON c.""Id"" = s.""ClassId""
                    WHERE c.""SchoolId"" = ANY(demo_ids));

                -- StudentObservations, StudentBadges, StudentFaceEncodings, StudentParents
                DELETE FROM ""StudentObservations"" WHERE ""StudentId"" IN (
                    SELECT s.""Id"" FROM ""Students"" s
                    JOIN ""Classes"" c ON c.""Id"" = s.""ClassId""
                    WHERE c.""SchoolId"" = ANY(demo_ids));
                DELETE FROM ""StudentBadges"" WHERE ""StudentId"" IN (
                    SELECT s.""Id"" FROM ""Students"" s
                    JOIN ""Classes"" c ON c.""Id"" = s.""ClassId""
                    WHERE c.""SchoolId"" = ANY(demo_ids));
                DELETE FROM ""StudentFaceEncodings"" WHERE ""StudentId"" IN (
                    SELECT s.""Id"" FROM ""Students"" s
                    JOIN ""Classes"" c ON c.""Id"" = s.""ClassId""
                    WHERE c.""SchoolId"" = ANY(demo_ids));
                DELETE FROM ""StudentParents"" WHERE ""StudentId"" IN (
                    SELECT s.""Id"" FROM ""Students"" s
                    JOIN ""Classes"" c ON c.""Id"" = s.""ClassId""
                    WHERE c.""SchoolId"" = ANY(demo_ids));

                -- FormSubmissions
                DELETE FROM ""FormSubmissionValues"" WHERE ""FormSubmissionId"" IN (
                    SELECT fs.""Id"" FROM ""FormSubmissions"" fs
                    JOIN ""Students"" s ON s.""Id"" = fs.""StudentId""
                    JOIN ""Classes"" c ON c.""Id"" = s.""ClassId""
                    WHERE c.""SchoolId"" = ANY(demo_ids));
                DELETE FROM ""FormSubmissions"" WHERE ""StudentId"" IN (
                    SELECT s.""Id"" FROM ""Students"" s
                    JOIN ""Classes"" c ON c.""Id"" = s.""ClassId""
                    WHERE c.""SchoolId"" = ANY(demo_ids));

                -- Students, ClassRoutineRules
                DELETE FROM ""Students"" WHERE ""ClassId"" IN (
                    SELECT ""Id"" FROM ""Classes"" WHERE ""SchoolId"" = ANY(demo_ids));
                DELETE FROM ""ClassRoutineRules"" WHERE ""SchoolId"" = ANY(demo_ids);

                -- Classes
                UPDATE ""Classes"" SET ""TeacherId"" = NULL WHERE ""SchoolId"" = ANY(demo_ids);
                DELETE FROM ""Classes"" WHERE ""SchoolId"" = ANY(demo_ids);

                -- School-level records
                DELETE FROM ""Badges"" WHERE ""SchoolId"" = ANY(demo_ids);
                DELETE FROM ""Announcements"" WHERE ""SchoolId"" = ANY(demo_ids);
                DELETE FROM ""SchoolCalendarEvents"" WHERE ""SchoolId"" = ANY(demo_ids);
                DELETE FROM ""MealPlanEntries"" WHERE ""SchoolId"" = ANY(demo_ids);
                DELETE FROM ""StudentObservations"" WHERE ""SchoolId"" = ANY(demo_ids);
                DELETE FROM ""ComplianceAcceptances"" WHERE ""SchoolId"" = ANY(demo_ids);
                DELETE FROM ""ComplianceDocuments"" WHERE ""SchoolId"" = ANY(demo_ids);
                DELETE FROM ""OtpCodes"" WHERE TRUE;

                -- Users in demo schools (except platform admin)
                DELETE FROM ""Users""
                WHERE ""SchoolId"" = ANY(demo_ids)
                  AND ""Email"" != 'admin@edulink.com';

                -- Schools
                UPDATE ""Schools"" SET ""PrimaryAdminUserId"" = NULL
                WHERE ""Id"" = ANY(demo_ids);
                DELETE FROM ""Schools"" WHERE ""Id"" = ANY(demo_ids);
            END $$;
        ");
    }
}

// ─── Middleware Pipeline ─────────────────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "EduLink API v1"));
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<CurrentUserMiddleware>();
app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");
app.UseHangfireDashboard("/hangfire");

app.Run();
