using System.Net;
using Xunit;

namespace SecureEscape.Api.Tests;

public class IntegrationTests : IClassFixture<IntegrationTestFactory>
{
    private readonly HttpClient _client;

    public IntegrationTests(IntegrationTestFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Api_Should_Start_Successfully()
    {
        // Swagger is intentionally disabled outside the Development
        // environment. A protected API endpoint is therefore used to
        // verify that the application starts and responds successfully.
        var response = await _client.GetAsync("/api/v1/risk-zones");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task RiskZones_Should_Reject_Unauthenticated_Request()
    {
        var response = await _client.GetAsync("/api/v1/risk-zones");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SecureEscape_Should_Reject_Unauthenticated_Request()
    {
        var response = await _client.GetAsync(
            "/api/v1/secure-escape/enrollment/status");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AdminUsers_Should_Reject_Unauthenticated_Request()
    {
        var response = await _client.GetAsync(
            "/api/v1/admin/users/analysts");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Accounts_Should_Reject_Unauthenticated_Request()
    {
        var response = await _client.GetAsync("/api/v1/accounts");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}