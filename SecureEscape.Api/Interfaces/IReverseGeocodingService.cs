namespace SecureEscape.Api.Interfaces;

public interface IReverseGeocodingService
{
    Task<string?> GetAddressAsync(
        decimal latitude,
        decimal longitude);
}