namespace EduLink.Application.DTOs.Posts;
public record ConfirmTagsRequest(
    List<ConfirmedTag> ConfirmedTags,
    List<Guid> AdditionalStudentIds // öğretmen manuel ekledi
);

public record ConfirmedTag(Guid StudentId, bool IsConfirmed);
