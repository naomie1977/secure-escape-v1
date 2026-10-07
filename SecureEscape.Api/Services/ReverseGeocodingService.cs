using System.Collections.Concurrent;
using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using SecureEscape.Api.Interfaces;

namespace SecureEscape.Api.Services;

public class ReverseGeocodingService : IReverseGeocodingService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ReverseGeocodingService> _logger;

    private static readonly ConcurrentDictionary<string, string?>
        AddressCache = new();

    public ReverseGeocodingService(
        HttpClient httpClient,
        ILogger<ReverseGeocodingService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<string?> GetAddressAsync(
        decimal latitude,
        decimal longitude)
    {
        var cacheKey = CreateCacheKey(
            latitude,
            longitude);

        if (AddressCache.TryGetValue(
                cacheKey,
                out var cachedAddress))
        {
            return cachedAddress;
        }

        try
        {
            var latitudeValue = latitude.ToString(
                CultureInfo.InvariantCulture);

            var longitudeValue = longitude.ToString(
                CultureInfo.InvariantCulture);

            var requestUrl =
                "https://nominatim.openstreetmap.org/reverse" +
                $"?format=jsonv2&lat={latitudeValue}" +
                $"&lon={longitudeValue}&zoom=18&addressdetails=1";

            using var request =
                new HttpRequestMessage(
                    HttpMethod.Get,
                    requestUrl);

            request.Headers.UserAgent.Add(
                new ProductInfoHeaderValue(
                    "SecureEscape",
                    "1.0"));

            using var response =
                await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Reverse geocoding failed with status code {StatusCode} for coordinates {Latitude}, {Longitude}.",
                    response.StatusCode,
                    latitude,
                    longitude);

                return null;
            }

            var json =
                await response.Content.ReadAsStringAsync();

            using var document =
                JsonDocument.Parse(json);

            if (!document.RootElement.TryGetProperty(
                    "display_name",
                    out var displayName))
            {
                return null;
            }

            var address = displayName.GetString();

            if (string.IsNullOrWhiteSpace(address))
            {
                return null;
            }

            AddressCache.TryAdd(
                cacheKey,
                address);

            return address;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Reverse geocoding failed for coordinates {Latitude}, {Longitude}.",
                latitude,
                longitude);

            return null;
        }
    }

    private static string CreateCacheKey(
        decimal latitude,
        decimal longitude)
    {
        return string.Create(
            CultureInfo.InvariantCulture,
            $"{latitude:F5},{longitude:F5}");
    }
}