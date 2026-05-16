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
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.FileProviders;
using System.Threading.RateLimiting;

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
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero,
            RoleClaimType = "role",
            NameClaimType = "sub"
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
    options.AddPolicy("AdminOnly",        p => p.RequireRole("Admin"));
    options.AddPolicy("TeacherOnly",      p => p.RequireRole("Teacher"));
    options.AddPolicy("ParentOnly",       p => p.RequireRole("Parent"));
    options.AddPolicy("SchoolAdminOnly",  p => p.RequireRole("SchoolAdmin"));
    options.AddPolicy("AdminOrTeacher",   p => p.RequireRole("Admin", "Teacher"));
    options.AddPolicy("SchoolAdminOrTeacher", p => p.RequireRole("SchoolAdmin", "Teacher"));
});

// ─── CORS ─────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            message = "Cok fazla demo talebi gonderildi. Lutfen biraz sonra tekrar deneyin."
        }, cancellationToken);
    };

    options.AddPolicy("DemoRequestPolicy", httpContext =>
    {
        var clientKey = ResolveClientKey(httpContext);
        return RateLimitPartition.GetFixedWindowLimiter(
            $"demo-request:{clientKey}",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true
            });
    });
});

// ─── SignalR ──────────────────────────────────────────────────────────────
builder.Services.AddSignalR()
    .AddStackExchangeRedis(redisConnStr); // Redis backplane for scale-out

// ─── Cloudinary ───────────────────────────────────────────────────────────
var cloudName = builder.Configuration["Cloudinary:CloudName"];
var cloudApiKey = builder.Configuration["Cloudinary:ApiKey"];
var cloudApiSecret = builder.Configuration["Cloudinary:ApiSecret"];

if (string.IsNullOrWhiteSpace(cloudName) ||
    string.IsNullOrWhiteSpace(cloudApiKey) ||
    string.IsNullOrWhiteSpace(cloudApiSecret))
{
    // Development fallback: allow API startup when Cloudinary secrets are not present.
    if (string.IsNullOrWhiteSpace(cloudName)) cloudName = "local-dev";
    if (string.IsNullOrWhiteSpace(cloudApiKey)) cloudApiKey = "local-dev";
    if (string.IsNullOrWhiteSpace(cloudApiSecret)) cloudApiSecret = "local-dev";
}

var cloudinaryAccount = new Account(
    cloudName,
    cloudApiKey,
    cloudApiSecret
);
builder.Services.AddSingleton(new Cloudinary(cloudinaryAccount));

// ─── Email ────────────────────────────────────────────────────────────────
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection("Email"));
builder.Services.AddScoped<IEmailService, SmtpEmailService>();

// ─── SMS ──────────────────────────────────────────────────────────────────
builder.Services.Configure<SmsOptions>(builder.Configuration.GetSection("Sms"));
builder.Services.Configure<NetgsmOptions>(builder.Configuration.GetSection("Netgsm"));
builder.Services.AddSingleton<MockSmsService>();
builder.Services.AddHttpClient<ProviderSmsService>();
builder.Services.AddHttpClient<NetgsmSmsService>();
builder.Services.AddScoped<ISmsService>(sp =>
{
    var netgsmOpts = sp.GetRequiredService<IOptions<NetgsmOptions>>().Value;
    if (!string.IsNullOrWhiteSpace(netgsmOpts.UserCode))
        return sp.GetRequiredService<NetgsmSmsService>();

    var smsOpts = sp.GetRequiredService<IOptions<SmsOptions>>().Value;
    if (string.Equals(smsOpts.Mode?.Trim(), "Provider", StringComparison.OrdinalIgnoreCase))
        return sp.GetRequiredService<ProviderSmsService>();

    return sp.GetRequiredService<MockSmsService>();
});
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<CloudinaryService>();
builder.Services.AddScoped<AiService>();
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
var webRootPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(webRootPath);

// ─── Auto Migrate + Seed ──────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (app.Environment.IsDevelopment())
    {
        db.Database.EnsureCreated();
    }
    else
    {
        db.Database.Migrate();
    }

    db.Database.ExecuteSqlRaw(@"
        CREATE TABLE IF NOT EXISTS ""DemoRequests"" (
            ""Id"" uuid NOT NULL,
            ""FirstName"" character varying(100) NOT NULL,
            ""LastName"" character varying(100) NOT NULL,
            ""SchoolName"" character varying(200) NOT NULL,
            ""Phone"" character varying(30) NOT NULL,
            ""StudentCount"" character varying(20),
            ""City"" character varying(100),
            ""Status"" character varying(30) NOT NULL DEFAULT 'new',
            ""Notes"" character varying(1000),
            ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now(),
            ""UpdatedAt"" timestamp with time zone,
            CONSTRAINT ""PK_DemoRequests"" PRIMARY KEY (""Id"")
        );
    ");

    void DeleteSchoolGraph(Guid schoolId)
    {
        db.Database.ExecuteSqlRaw($@"
            DO $$
            DECLARE target_school_id UUID := '{schoolId}'::UUID;
            BEGIN
                DELETE FROM ""Messages"" WHERE ""SenderId"" IN (
                    SELECT ""Id"" FROM ""Users"" WHERE ""SchoolId"" = target_school_id);
                DELETE FROM ""ConversationParticipants"" WHERE ""UserId"" IN (
                    SELECT ""Id"" FROM ""Users"" WHERE ""SchoolId"" = target_school_id);
                DELETE FROM ""Conversations"" WHERE ""Id"" NOT IN (
                    SELECT DISTINCT ""ConversationId"" FROM ""ConversationParticipants"");

                DELETE FROM ""PostStudentTags"" WHERE ""PostId"" IN (
                    SELECT p.""Id"" FROM ""Posts"" p
                    JOIN ""Classes"" c ON c.""Id"" = p.""ClassId""
                    WHERE c.""SchoolId"" = target_school_id);
                DELETE FROM ""PostMedias"" WHERE ""PostId"" IN (
                    SELECT p.""Id"" FROM ""Posts"" p
                    JOIN ""Classes"" c ON c.""Id"" = p.""ClassId""
                    WHERE c.""SchoolId"" = target_school_id);
                DELETE FROM ""Posts"" WHERE ""ClassId"" IN (
                    SELECT ""Id"" FROM ""Classes"" WHERE ""SchoolId"" = target_school_id);

                DELETE FROM ""Submissions"" WHERE ""AssignmentId"" IN (
                    SELECT a.""Id"" FROM ""Assignments"" a
                    JOIN ""Classes"" c ON c.""Id"" = a.""ClassId""
                    WHERE c.""SchoolId"" = target_school_id);
                DELETE FROM ""Assignments"" WHERE ""ClassId"" IN (
                    SELECT ""Id"" FROM ""Classes"" WHERE ""SchoolId"" = target_school_id);

                DELETE FROM ""Attendances"" WHERE ""ClassId"" IN (
                    SELECT ""Id"" FROM ""Classes"" WHERE ""SchoolId"" = target_school_id);
                DELETE FROM ""DailyReports"" WHERE ""StudentId"" IN (
                    SELECT s.""Id"" FROM ""Students"" s
                    JOIN ""Classes"" c ON c.""Id"" = s.""ClassId""
                    WHERE c.""SchoolId"" = target_school_id);

                DELETE FROM ""StudentObservations"" WHERE ""StudentId"" IN (
                    SELECT s.""Id"" FROM ""Students"" s
                    JOIN ""Classes"" c ON c.""Id"" = s.""ClassId""
                    WHERE c.""SchoolId"" = target_school_id);
                DELETE FROM ""StudentBadges"" WHERE ""StudentId"" IN (
                    SELECT s.""Id"" FROM ""Students"" s
                    JOIN ""Classes"" c ON c.""Id"" = s.""ClassId""
                    WHERE c.""SchoolId"" = target_school_id);
                DELETE FROM ""StudentFaceEncodings"" WHERE ""StudentId"" IN (
                    SELECT s.""Id"" FROM ""Students"" s
                    JOIN ""Classes"" c ON c.""Id"" = s.""ClassId""
                    WHERE c.""SchoolId"" = target_school_id);
                DELETE FROM ""StudentParents"" WHERE ""StudentId"" IN (
                    SELECT s.""Id"" FROM ""Students"" s
                    JOIN ""Classes"" c ON c.""Id"" = s.""ClassId""
                    WHERE c.""SchoolId"" = target_school_id);

                DELETE FROM ""FormSubmissionValues"" WHERE ""FormSubmissionId"" IN (
                    SELECT fs.""Id"" FROM ""FormSubmissions"" fs
                    JOIN ""Students"" s ON s.""Id"" = fs.""StudentId""
                    JOIN ""Classes"" c ON c.""Id"" = s.""ClassId""
                    WHERE c.""SchoolId"" = target_school_id);
                DELETE FROM ""FormSubmissions"" WHERE ""StudentId"" IN (
                    SELECT s.""Id"" FROM ""Students"" s
                    JOIN ""Classes"" c ON c.""Id"" = s.""ClassId""
                    WHERE c.""SchoolId"" = target_school_id);

                DELETE FROM ""OtpCodes"" WHERE ""Identifier"" IN (
                    SELECT DISTINCT
                        CASE
                            WHEN LENGTH(REGEXP_REPLACE(COALESCE(""Phone"", ''), '\D', '', 'g')) = 10
                                THEN '0' || REGEXP_REPLACE(COALESCE(""Phone"", ''), '\D', '', 'g')
                            WHEN LENGTH(REGEXP_REPLACE(COALESCE(""Phone"", ''), '\D', '', 'g')) = 12
                                 AND LEFT(REGEXP_REPLACE(COALESCE(""Phone"", ''), '\D', '', 'g'), 2) = '90'
                                THEN '0' || RIGHT(REGEXP_REPLACE(COALESCE(""Phone"", ''), '\D', '', 'g'), 10)
                            ELSE REGEXP_REPLACE(COALESCE(""Phone"", ''), '\D', '', 'g')
                        END
                    FROM ""Users""
                    WHERE ""SchoolId"" = target_school_id AND ""Phone"" IS NOT NULL
                );

                DELETE FROM ""Students"" WHERE ""ClassId"" IN (
                    SELECT ""Id"" FROM ""Classes"" WHERE ""SchoolId"" = target_school_id);
                DELETE FROM ""ClassRoutineRules"" WHERE ""SchoolId"" = target_school_id;
                UPDATE ""Classes"" SET ""TeacherId"" = NULL WHERE ""SchoolId"" = target_school_id;
                DELETE FROM ""Classes"" WHERE ""SchoolId"" = target_school_id;
                DELETE FROM ""Badges"" WHERE ""SchoolId"" = target_school_id;
                DELETE FROM ""Announcements"" WHERE ""SchoolId"" = target_school_id;
                DELETE FROM ""SchoolCalendarEvents"" WHERE ""SchoolId"" = target_school_id;
                DELETE FROM ""MealPlanEntries"" WHERE ""SchoolId"" = target_school_id;
                DELETE FROM ""StudentObservations"" WHERE ""SchoolId"" = target_school_id;
                DELETE FROM ""ComplianceAcceptances"" WHERE ""SchoolId"" = target_school_id;
                DELETE FROM ""ComplianceDocuments"" WHERE ""SchoolId"" = target_school_id;

                UPDATE ""Schools"" SET ""PrimaryAdminUserId"" = NULL WHERE ""Id"" = target_school_id;
                DELETE FROM ""Users"" WHERE ""SchoolId"" = target_school_id;
                DELETE FROM ""Schools"" WHERE ""Id"" = target_school_id;
            END $$;
        ");
    }

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
    var platformAdminEmail = "admin@notioedu.com";
    var platformAdminPhone = "05337102009";
    var bootstrapPlatformAdminPassword = builder.Configuration["Bootstrap:PlatformAdminPassword"];
    var isDevelopment = app.Environment.IsDevelopment();
    // Also migrate old email if it still exists
    var oldAdminEmail = "admin@edulink.com";
    var existingAdmin = db.Users.FirstOrDefault(u => u.Email == platformAdminEmail || u.Email == oldAdminEmail);
    if (existingAdmin == null)
    {
        var seedPassword = !string.IsNullOrWhiteSpace(bootstrapPlatformAdminPassword)
            ? bootstrapPlatformAdminPassword
            : (isDevelopment ? "Admin123!" : null);

        if (string.IsNullOrWhiteSpace(seedPassword))
        {
            app.Logger.LogWarning(
                "Platform admin user was not seeded because Bootstrap:PlatformAdminPassword is not configured for environment {EnvironmentName}.",
                app.Environment.EnvironmentName);
        }
        else
        {
        db.Users.Add(new EduLink.Domain.Entities.User
        {
            Id = Guid.NewGuid(),
            FullName = "Admin Kullanıcı",
            Email = platformAdminEmail,
            Phone = platformAdminPhone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(seedPassword),
            Role = EduLink.Domain.Enums.UserRole.Admin,
            SchoolId = platformSchoolId,
            IsActive = true,
            MustChangePassword = !isDevelopment,
            CreatedAt = DateTime.UtcNow
        });
        db.SaveChanges();
        }
    }
    else
    {
        // Ensure admin has correct email, role, and school
        var changed = false;
        if (existingAdmin.Email != platformAdminEmail) { existingAdmin.Email = platformAdminEmail; changed = true; }
        if (existingAdmin.Phone != platformAdminPhone) { existingAdmin.Phone = platformAdminPhone; changed = true; }
        if (existingAdmin.Role != EduLink.Domain.Enums.UserRole.Admin) { existingAdmin.Role = EduLink.Domain.Enums.UserRole.Admin; changed = true; }
        if (existingAdmin.SchoolId != platformSchoolId) { existingAdmin.SchoolId = platformSchoolId; changed = true; }
        if (changed) db.SaveChanges();
    }

    var demoSchoolId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    var legacyDemoSchoolId = Guid.Parse("00000000-0000-0000-0000-000000000001");
    var enableDemoSchoolSeed = builder.Configuration.GetValue("Seed:EnableDemoSchool", false);
    if (db.Schools.Any(s => s.Id == legacyDemoSchoolId))
    {
        DeleteSchoolGraph(legacyDemoSchoolId);
    }

    if (!enableDemoSchoolSeed && db.Schools.Any(s => s.Id == demoSchoolId))
    {
        DeleteSchoolGraph(demoSchoolId);
    }

    var demoSchoolAdminId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    var demoTeacherId = Guid.Parse("33333333-3333-3333-3333-333333333333");
    var demoParentId = Guid.Parse("44444444-4444-4444-4444-444444444444");
    var demoClassId = Guid.Parse("55555555-5555-5555-5555-555555555555");
    var demoStudentId = Guid.Parse("66666666-6666-6666-6666-666666666666");
    var teacherParentConversationId = Guid.Parse("88888888-8888-8888-8888-888888888888");
    var parentAdminConversationId = Guid.Parse("99999999-9999-9999-9999-999999999999");
    var teacherAdminConversationId = Guid.Parse("AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA");

    if (enableDemoSchoolSeed)
    {
        var demoSchool = db.Schools.FirstOrDefault(s => s.Id == demoSchoolId);
        if (demoSchool is null)
        {
            demoSchool = new EduLink.Domain.Entities.School
            {
                Id = demoSchoolId,
                Name = "Küçük Sıralar Anaokulları",
                IsActive = true,
                Plan = "demo",
                FamilyMessagingMode = "separate_parents",
                CreatedAt = DateTime.UtcNow
            };
            db.Schools.Add(demoSchool);
        }
        else
        {
            demoSchool.Name = "Küçük Sıralar Anaokulları";
            demoSchool.IsActive = true;
            demoSchool.Plan = "demo";
            demoSchool.FamilyMessagingMode = "separate_parents";
        }

        db.SaveChanges();

        EduLink.Domain.Entities.User UpsertDemoUser(Guid id, string fullName, string email, string? phone, EduLink.Domain.Enums.UserRole role)
        {
            var user = db.Users.FirstOrDefault(u => u.Id == id || u.Email == email);
            if (user is null)
            {
                user = new EduLink.Domain.Entities.User
                {
                    Id = id,
                    FullName = fullName,
                    Email = email,
                    Phone = phone,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                    Role = role,
                    SchoolId = demoSchoolId,
                    IsActive = true,
                    MustChangePassword = false,
                    RefreshToken = null,
                    RefreshTokenExpiry = null,
                    CreatedAt = DateTime.UtcNow
                };
                db.Users.Add(user);
            }
            else
            {
                user.FullName = fullName;
                user.Email = email;
                user.Phone = phone;
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!");
                user.Role = role;
                user.SchoolId = demoSchoolId;
                user.IsActive = true;
                user.MustChangePassword = false;
                user.RefreshToken = null;
                user.RefreshTokenExpiry = null;
            }

            return user;
        }

        var demoSchoolAdmin = UpsertDemoUser(
            demoSchoolAdminId,
            "Sümeyra Darendeli",
            "sumeyra.darendeli@notio.test",
            "05337102008",
            EduLink.Domain.Enums.UserRole.SchoolAdmin);

        var demoTeacher = UpsertDemoUser(
            demoTeacherId,
            "Elif Toksoy",
            "elif.toksoy@notio.test",
            "05442698494",
            EduLink.Domain.Enums.UserRole.Teacher);

        var demoParent = UpsertDemoUser(
            demoParentId,
            "Sezer Darendeli",
            "sezer.darendeli@notio.test",
            "05337102007",
            EduLink.Domain.Enums.UserRole.Parent);

        db.SaveChanges();

        if (demoSchool.PrimaryAdminUserId != demoSchoolAdmin.Id)
        {
            demoSchool.PrimaryAdminUserId = demoSchoolAdmin.Id;
            db.SaveChanges();
        }

        var demoClass = db.Classes.FirstOrDefault(c => c.Id == demoClassId);
        if (demoClass is null)
        {
            demoClass = new EduLink.Domain.Entities.Class
            {
                Id = demoClassId,
                Name = "Harfler Dünyası",
                SchoolId = demoSchoolId,
                TeacherId = demoTeacher.Id,
                AcademicYear = "2025-2026",
                CreatedAt = DateTime.UtcNow
            };
            db.Classes.Add(demoClass);
        }
        else
        {
            demoClass.Name = "Harfler Dünyası";
            demoClass.SchoolId = demoSchoolId;
            demoClass.TeacherId = demoTeacher.Id;
            demoClass.AcademicYear = "2025-2026";
        }

        db.SaveChanges();

        var demoStudent = db.Students.FirstOrDefault(s => s.Id == demoStudentId);
        if (demoStudent is null)
        {
            demoStudent = new EduLink.Domain.Entities.Student
            {
                Id = demoStudentId,
                FullName = "Rana Darendeli",
                BirthDate = new DateOnly(2020, 9, 1),
                ClassId = demoClassId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            db.Students.Add(demoStudent);
        }
        else
        {
            demoStudent.FullName = "Rana Darendeli";
            demoStudent.BirthDate = new DateOnly(2020, 9, 1);
            demoStudent.ClassId = demoClassId;
            demoStudent.IsActive = true;
        }

        if (!db.StudentParents.Any(sp => sp.StudentId == demoStudentId && sp.ParentId == demoParent.Id))
        {
            db.StudentParents.Add(new EduLink.Domain.Entities.StudentParent
            {
                StudentId = demoStudentId,
                ParentId = demoParent.Id,
                Relationship = "Baba",
                IsPrimaryContact = true,
                CanPickup = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        db.SaveChanges();

        void EnsureDirectConversation(Guid conversationId, params Guid[] participantIds)
        {
            var conversation = db.Conversations
                .Include(c => c.Participants)
                .FirstOrDefault(c => c.Id == conversationId);

            if (conversation is null)
            {
                conversation = new EduLink.Domain.Entities.Conversation
                {
                    Id = conversationId,
                    Type = EduLink.Domain.Enums.ConversationType.Direct,
                    CreatedAt = DateTime.UtcNow
                };
                db.Conversations.Add(conversation);
            }

            foreach (var participantId in participantIds.Distinct())
            {
                var exists = db.ConversationParticipants.Any(cp => cp.ConversationId == conversationId && cp.UserId == participantId);
                if (!exists)
                {
                    db.ConversationParticipants.Add(new EduLink.Domain.Entities.ConversationParticipant
                    {
                        ConversationId = conversationId,
                        UserId = participantId,
                        JoinedAt = DateTime.UtcNow
                    });
                }
            }
        }

        void SeedConversationIfEmpty(Guid conversationId, Guid senderId, string content)
        {
            if (db.Messages.Any(m => m.ConversationId == conversationId))
            {
                return;
            }

            db.Messages.Add(new EduLink.Domain.Entities.Message
            {
                Id = Guid.NewGuid(),
                ConversationId = conversationId,
                SenderId = senderId,
                Content = content,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
        }

        EnsureDirectConversation(teacherParentConversationId, demoTeacher.Id, demoParent.Id);
        EnsureDirectConversation(parentAdminConversationId, demoParent.Id, demoSchoolAdmin.Id);
        EnsureDirectConversation(teacherAdminConversationId, demoTeacher.Id, demoSchoolAdmin.Id);

        db.SaveChanges();

        SeedConversationIfEmpty(
            teacherParentConversationId,
            demoTeacher.Id,
            "Merhaba, Rana bugün kitap köşesinde çok keyifliydi. Yarın kitap günü için küçük bir hikâye kitabı getirebilir misiniz?");

        SeedConversationIfEmpty(
            parentAdminConversationId,
            demoSchoolAdmin.Id,
            "Merhaba, okul iletişim kanalı üzerinden bize her zaman yazabilirsiniz.");

        SeedConversationIfEmpty(
            teacherAdminConversationId,
            demoSchoolAdmin.Id,
            "Merhaba Elif öğretmenim, veli iletişimlerinde bu hat üzerinden de destek olacağız.");

        db.SaveChanges();
    }
}

// ─── Middleware Pipeline ─────────────────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "EduLink API v1"));
app.MapGet("/healthz", () => Results.Text("ok"));
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(webRootPath)
});
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<CurrentUserMiddleware>();
app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");
app.UseHangfireDashboard("/hangfire");

app.Run();

static string ResolveClientKey(HttpContext httpContext)
{
    var forwardedFor = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
    if (!string.IsNullOrWhiteSpace(forwardedFor))
    {
        return forwardedFor.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault() ?? "unknown";
    }

    return httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}
