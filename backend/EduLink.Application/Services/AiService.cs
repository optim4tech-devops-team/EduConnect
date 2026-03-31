using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace EduLink.Application.Services;

public class AiService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _baseUrl;
    private readonly string _apiKey;

    public AiService(IHttpClientFactory httpClientFactory, IConfiguration config)
    {
        _httpClientFactory = httpClientFactory;
        _baseUrl = config["AiService:BaseUrl"] ?? "http://ai-service:8000";
        _apiKey = config["AiService:ApiKey"] ?? string.Empty;
    }

    public async Task<bool> EnrollFacesAsync(Guid studentId, List<string> photoUrls)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", _apiKey);

        var payload = new
        {
            student_id = studentId.ToString(),
            photo_urls = photoUrls
        };

        var response = await client.PostAsJsonAsync($"{_baseUrl}/enroll", payload);
        return response.IsSuccessStatusCode;
    }

    public async Task<List<(Guid StudentId, float Confidence)>> RecognizeFacesAsync(
        Guid postId,
        string photoUrl,
        List<Guid> classStudentIds,
        Guid classId)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", _apiKey);

        var payload = new
        {
            post_id = postId.ToString(),
            photo_url = photoUrl,
            class_student_ids = classStudentIds.Select(id => id.ToString()).ToList(),
            class_id = classId.ToString()
        };

        var response = await client.PostAsJsonAsync($"{_baseUrl}/recognize", payload);

        if (!response.IsSuccessStatusCode)
            return new List<(Guid, float)>();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();

        var results = new List<(Guid StudentId, float Confidence)>();

        if (json.TryGetProperty("matches", out var matches))
        {
            foreach (var match in matches.EnumerateArray())
            {
                if (match.TryGetProperty("student_id", out var studentIdEl) &&
                    match.TryGetProperty("confidence", out var confidenceEl))
                {
                    if (Guid.TryParse(studentIdEl.GetString(), out var studentId) &&
                        confidenceEl.TryGetSingle(out var confidence))
                    {
                        results.Add((studentId, confidence));
                    }
                }
            }
        }

        return results;
    }
}
