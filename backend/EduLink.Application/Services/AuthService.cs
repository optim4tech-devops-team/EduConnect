using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EduLink.Application.DTOs.Auth;
using EduLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace EduLink.Application.Services;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<LoginResponse?> LoginAsync(string email, string password)
    {
        var user = await _db.Users
            .Include(u => u.School)
            .FirstOrDefaultAsync(u => u.Email == email && u.IsActive);

        if (user is null)
            return null;

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return null;

        var accessToken = GenerateAccessToken(user.Id, user.Email, user.Role.ToString(), user.SchoolId);
        var refreshToken = GenerateRefreshToken();

        var refreshExpiryDays = _config.GetValue<int>("Jwt:RefreshExpiryDays", 30);
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(refreshExpiryDays);
        await _db.SaveChangesAsync();

        return new LoginResponse(
            AccessToken: accessToken,
            RefreshToken: refreshToken,
            Role: user.Role.ToString(),
            UserId: user.Id,
            FullName: user.FullName,
            AvatarUrl: user.AvatarUrl,
            SchoolId: user.SchoolId
        );
    }

    public async Task<LoginResponse?> RefreshAsync(string refreshToken)
    {
        var user = await _db.Users
            .Include(u => u.School)
            .FirstOrDefaultAsync(u =>
                u.RefreshToken == refreshToken &&
                u.RefreshTokenExpiry > DateTime.UtcNow &&
                u.IsActive);

        if (user is null)
            return null;

        var accessToken = GenerateAccessToken(user.Id, user.Email, user.Role.ToString(), user.SchoolId);
        var newRefreshToken = GenerateRefreshToken();

        var refreshExpiryDays = _config.GetValue<int>("Jwt:RefreshExpiryDays", 30);
        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(refreshExpiryDays);
        await _db.SaveChangesAsync();

        return new LoginResponse(
            AccessToken: accessToken,
            RefreshToken: newRefreshToken,
            Role: user.Role.ToString(),
            UserId: user.Id,
            FullName: user.FullName,
            AvatarUrl: user.AvatarUrl,
            SchoolId: user.SchoolId
        );
    }

    public async Task<bool> LogoutAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return false;

        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        await _db.SaveChangesAsync();
        return true;
    }

    private string GenerateAccessToken(Guid userId, string email, string role, Guid schoolId)
    {
        var secret = _config["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret is not configured.");
        var expiryMinutes = _config.GetValue<int>("Jwt:ExpiryMinutes", 60);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(ClaimTypes.Role, role),
            new Claim("schoolId", schoolId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }
}
