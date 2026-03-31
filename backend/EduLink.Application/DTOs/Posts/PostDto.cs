using EduLink.Domain.Enums;
namespace EduLink.Application.DTOs.Posts;
public record PostDto(
    Guid Id,
    Guid TeacherId,
    string TeacherName,
    Guid ClassId,
    string? Caption,
    PostType PostType,
    bool IsPublished,
    bool AiProcessed,
    DateTime CreatedAt,
    List<PostMediaDto> Media,
    List<PostTagDto> StudentTags
);

public record PostMediaDto(Guid Id, string MediaUrl, string MediaType);
public record PostTagDto(Guid StudentId, string StudentName, float? AiConfidence, bool IsConfirmed);
