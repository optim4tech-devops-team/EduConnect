using EduLink.Application.Services;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
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
var redisConn = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(redisConn));

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
    .AddStackExchangeRedis(redisConn); // Redis backplane for scale-out

// ─── Cloudinary ───────────────────────────────────────────────────────────
var cloudinaryAccount = new Account(
    builder.Configuration["Cloudinary:CloudName"],
    builder.Configuration["Cloudinary:ApiKey"],
    builder.Configuration["Cloudinary:ApiSecret"]
);
builder.Services.AddSingleton(new Cloudinary(cloudinaryAccount));

// ─── Application Services ────────────────────────────────────────────────
builder.Services.AddSingleton<ISmsService, MockSmsService>();
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

    // Seed default school and admin user if they don't exist
    if (!db.Schools.Any())
    {
        var school = new EduLink.Domain.Entities.School
        {
            Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
            Name = "EduLink Demo Okul",
            CreatedAt = DateTime.UtcNow
        };
        db.Schools.Add(school);
        db.SaveChanges();
    }

    if (!db.Users.Any(u => u.Email == "admin@edulink.com"))
    {
        var schoolId = db.Schools.First().Id;
        var admin = new EduLink.Domain.Entities.User
        {
            Id = Guid.NewGuid(),
            FullName = "Admin Kullanıcı",
            Email = "admin@edulink.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            Role = EduLink.Domain.Enums.UserRole.Admin,
            SchoolId = schoolId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Users.Add(admin);
        db.SaveChanges();
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
