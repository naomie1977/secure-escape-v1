using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SecureEscape.Api.Data;

// Migration generation must not connect to a running development/production DB.
public class AppDbContextDesignFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("SECUREESCAPE_MIGRATION_CONNECTION")
            ?? "Server=localhost;Database=SecureEscape;User=migrations;Password=unused;";
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseMySql(connection, new MySqlServerVersion(new Version(8, 0, 21))).Options;
        return new AppDbContext(options);
    }
}

