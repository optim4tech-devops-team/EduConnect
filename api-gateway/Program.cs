using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Add YARP
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

builder.Services.AddHealthChecks();

// Add CORS if needed (the gateway usually handles this for the apps)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

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

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        var isDemoRequestPost =
            HttpMethods.IsPost(httpContext.Request.Method) &&
            httpContext.Request.Path.StartsWithSegments("/api/demo-requests");

        if (!isDemoRequestPost)
        {
            return RateLimitPartition.GetNoLimiter("not-limited");
        }

        var clientKey = ResolveClientKey(httpContext);
        return RateLimitPartition.GetFixedWindowLimiter(
            $"demo-request:{clientKey}",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true
            });
    });
});

var app = builder.Build();

app.UseCors();
app.UseRateLimiter();

app.MapHealthChecks("/healthz");

// Map YARP
app.MapReverseProxy();

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
