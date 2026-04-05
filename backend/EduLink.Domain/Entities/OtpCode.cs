namespace EduLink.Domain.Entities;

public class OtpCode
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Identifier { get; set; } = ""; // phone or email
    public string Code { get; set; } = "";        // 6-digit
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
