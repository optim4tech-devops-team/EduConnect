namespace EduLink.Application.Services;

public class MockSmsService : ISmsService
{
    public Task SendOtpAsync(string phone, string code)
    {
        Console.WriteLine($"[OTP MOCK] {phone} --> {code}");
        return Task.CompletedTask;
    }
}
