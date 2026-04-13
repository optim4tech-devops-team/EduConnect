using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EduLink.Application.Services;

public class NetgsmOptions
{
    public string UserCode { get; set; } = "";
    public string ApiKey   { get; set; } = "";
    public string Header   { get; set; } = "NOTIO";  // Sender name (onaylı başlık)
}

public class NetgsmSmsService : ISmsService
{
    private const string BaseUrl = "https://api.netgsm.com.tr/sms/rest/send/";

    private readonly HttpClient _http;
    private readonly NetgsmOptions _opts;
    private readonly ILogger<NetgsmSmsService> _logger;

    public NetgsmSmsService(
        HttpClient http,
        IOptions<NetgsmOptions> opts,
        ILogger<NetgsmSmsService> logger)
    {
        _http   = http;
        _opts   = opts.Value;
        _logger = logger;
    }

    public async Task SendOtpAsync(string phone, string code)
    {
        var message = $"Notio dogrulama kodunuz: {code}";
        await SendAsync(phone, message);
    }

    public async Task SendRawAsync(string phone, string message)
        => await SendAsync(phone, message);

    private async Task SendAsync(string phone, string message)
    {
        // Netgsm expects E.164-like format without leading 0: 905XXXXXXXXX
        var normalized = NormalizeForNetgsm(phone);

        var payload = new NetgsmRequest
        {
            UserCode = _opts.UserCode,
            ApiKey   = _opts.ApiKey,
            Header   = _opts.Header,
            Messages =
            [
                new NetgsmMessage
                {
                    Phones = [normalized],
                    Text   = message
                }
            ]
        };

        var response = await _http.PostAsJsonAsync(BaseUrl, payload);
        var body     = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Netgsm error {Status}: {Body}", (int)response.StatusCode, body);
            response.EnsureSuccessStatusCode();
        }

        _logger.LogInformation("SMS sent via Netgsm to {Phone}", normalized);
    }

    private static string NormalizeForNetgsm(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());

        if (digits.StartsWith("0090")) digits = digits[2..];       // 0090 → 90…
        else if (digits.StartsWith("0") && digits.Length == 11)    // 05XX → 905XX
            digits = $"9{digits[1..]}";
        else if (!digits.StartsWith("90"))
            digits = $"90{digits}";

        return digits;
    }
}

// ─── Netgsm REST payload ──────────────────────────────────────────────────────

file class NetgsmRequest
{
    [JsonPropertyName("usercode")] public string UserCode { get; set; } = "";
    [JsonPropertyName("apikey")]   public string ApiKey   { get; set; } = "";
    [JsonPropertyName("header")]   public string Header   { get; set; } = "";
    [JsonPropertyName("messages")] public NetgsmMessage[] Messages { get; set; } = [];
}

file class NetgsmMessage
{
    [JsonPropertyName("phone")] public string[] Phones { get; set; } = [];
    [JsonPropertyName("text")]  public string   Text   { get; set; } = "";
}
