using EduLink.Application.DTOs.Auth;
using EduLink.Application.Services;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;


namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly AppDbContext _db;

    public AuthController(AuthService authService, AppDbContext db)
    {
        _authService = authService;
        _db = db;
    }

    /// <summary>Looks up a user by phone/email and returns school branding info.</summary>
    [HttpPost("lookup")]
    [ProducesResponseType(typeof(LookupResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Lookup([FromBody] LookupRequest request)
    {
        var result = await _authService.LookupAsync(request.Identifier);
        if (result is null)
            return NotFound(new { message = "Kullanici bulunamadi." });

        return Ok(result);
    }

    /// <summary>Sends an OTP SMS to the user's registered phone number.</summary>
    [HttpPost("send-otp")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SendOtp([FromBody] SendOtpRequest request)
    {
        var sent = await _authService.SendOtpAsync(request.Identifier);
        if (!sent)
            return NotFound(new { message = "Kullanici bulunamadi." });

        return Ok(new { message = "OTP gonderildi." });
    }

    /// <summary>Verifies OTP and returns JWT tokens on success.</summary>
    [HttpPost("verify-otp")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
    {
        var result = await _authService.VerifyOtpAsync(request.Identifier, request.Code);
        if (result is null)
            return Unauthorized(new { message = "Gecersiz veya suresi dolmus OTP." });

        return Ok(result);
    }

    /// <summary>Authenticates a user and returns JWT tokens.</summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request.Email, request.Password);
        if (result is null)
            return Unauthorized(new { message = "Invalid email or password." });

        return Ok(result);
    }

    /// <summary>Issues new tokens using a valid refresh token.</summary>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        var result = await _authService.RefreshAsync(request.RefreshToken);
        if (result is null)
            return Unauthorized(new { message = "Invalid or expired refresh token." });

        return Ok(result);
    }

    /// <summary>Returns the currently authenticated user's profile.</summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Me()
    {
        var userIdStr = HttpContext.Items["UserId"]?.ToString();
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var user = await _db.Users.FindAsync(userId);
        if (user is null || !user.IsActive)
            return Unauthorized();

        return Ok(new
        {
            id = user.Id,
            name = user.FullName,
            role = user.Role.ToString(),
            avatarUrl = user.AvatarUrl,
            schoolId = user.SchoolId,
            email = user.Email,
            phone = user.Phone,
        });
    }

    /// <summary>Logs out the current user by invalidating the refresh token.</summary>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout()
    {
        var userIdStr = HttpContext.Items["UserId"]?.ToString();
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        await _authService.LogoutAsync(userId);
        return NoContent();
    }
}
