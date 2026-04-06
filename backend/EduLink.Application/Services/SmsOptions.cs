namespace EduLink.Application.Services;

public class SmsOptions
{
    public string Mode { get; set; } = "Mock";
    public string? ProviderUrl { get; set; }
    public string SendPath { get; set; } = "/send";
    public string ApiKeyHeaderName { get; set; } = "X-Api-Key";
    public string? ApiKey { get; set; }
    public string? Sender { get; set; }
    public string MessageTemplate { get; set; } = "Notio dogrulama kodunuz: {code}";
}
