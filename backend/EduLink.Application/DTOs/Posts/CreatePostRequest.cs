using EduLink.Domain.Enums;
namespace EduLink.Application.DTOs.Posts;
public record CreatePostRequest(
    Guid ClassId,
    string? Caption,
    PostType PostType,
    List<string> MediaUrls,        // Cloudinary URLs
    List<string>? MediaPublicIds,  // Cloudinary public IDs
    List<Guid>? TargetStudentIds   // null = tüm sınıf, liste = belirli öğrenciler
);
