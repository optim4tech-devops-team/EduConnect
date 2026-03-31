using System.Security.Claims;

namespace EduLink.Api.Middleware;

public class CurrentUserMiddleware
{
    private readonly RequestDelegate _next;

    public CurrentUserMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)
                              ?? context.User.FindFirst("sub");

            var roleClaim = context.User.FindFirst(ClaimTypes.Role);
            var schoolIdClaim = context.User.FindFirst("schoolId");

            if (userIdClaim is not null && Guid.TryParse(userIdClaim.Value, out var userId))
                context.Items["UserId"] = userId;

            if (roleClaim is not null)
                context.Items["Role"] = roleClaim.Value;

            if (schoolIdClaim is not null && Guid.TryParse(schoolIdClaim.Value, out var schoolId))
                context.Items["SchoolId"] = schoolId;
        }

        await _next(context);
    }
}

public static class CurrentUserMiddlewareExtensions
{
    public static IApplicationBuilder UseCurrentUser(this IApplicationBuilder builder)
        => builder.UseMiddleware<CurrentUserMiddleware>();
}
