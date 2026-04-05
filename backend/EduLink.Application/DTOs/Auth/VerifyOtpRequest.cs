namespace EduLink.Application.DTOs.Auth;

public record VerifyOtpRequest(string Identifier, string Code);
