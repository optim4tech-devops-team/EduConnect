using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace EduLink.Infrastructure.Persistence;

/// <summary>
/// Design-time factory used by dotnet-ef when generating migrations.
/// Reads connection string from environment variable or appsettings.Development.json.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        // Allow override via env var for CI/CD
        var connectionString = Environment.GetEnvironmentVariable("EF_CONNECTION_STRING")
            ?? "Host=localhost;Port=5433;Database=edulink_db;Username=edulink_user;Password=edulink_pass_change_me";

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(connectionString, npgsql => npgsql.UseVector());

        return new AppDbContext(optionsBuilder.Options);
    }
}
