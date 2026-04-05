namespace EduLink.Application.Services;

public interface ISmsService
{
    Task SendOtpAsync(string phone, string code);
}
