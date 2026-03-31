using EduLink.Application.DTOs.Posts;
using EduLink.Domain.Entities;
using EduLink.Domain.Enums;
using EduLink.Infrastructure.Persistence;
using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/posts")]
[Authorize]
public class PostsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<PostsController> _logger;

    public PostsController(AppDbContext db, ILogger<PostsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // GET /api/posts
    [HttpGet]
    public async Task<IActionResult> GetPosts()
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();
        var role     = GetRole();

        if (role == "Teacher")
        {
            // Teacher sees all posts for their class(es)
            var posts = await _db.Posts
                .Include(p => p.Teacher)
                .Include(p => p.Media)
                .Include(p => p.StudentTags).ThenInclude(t => t.Student)
                .Where(p => p.Teacher.SchoolId == schoolId && p.TeacherId == userId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Ok(posts.Select(MapToDto));
        }

        if (role == "Parent")
        {
            // Parent sees only published posts where their child is tagged
            var childIds = await _db.StudentParents
                .Where(sp => sp.ParentId == userId)
                .Select(sp => sp.StudentId)
                .ToListAsync();

            var posts = await _db.Posts
                .Include(p => p.Teacher)
                .Include(p => p.Media)
                .Include(p => p.StudentTags).ThenInclude(t => t.Student)
                .Where(p => p.IsPublished
                    && p.Teacher.SchoolId == schoolId
                    && p.StudentTags.Any(t => childIds.Contains(t.StudentId)))
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Ok(posts.Select(MapToDto));
        }

        return Forbid();
    }

    // POST /api/posts
    [HttpPost]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> CreatePost([FromBody] CreatePostRequest request)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();

        // Verify class belongs to this school and is taught by this teacher
        var cls = await _db.Classes
            .FirstOrDefaultAsync(c => c.Id == request.ClassId && c.SchoolId == schoolId && c.TeacherId == userId);

        if (cls is null)
            return BadRequest(new { message = "Class not found or you are not the assigned teacher." });

        var post = new Post
        {
            Id          = Guid.NewGuid(),
            TeacherId   = userId,
            ClassId     = request.ClassId,
            Caption     = request.Caption,
            PostType    = request.PostType,
            IsPublished = false,
            AiProcessed = false,
            CreatedAt   = DateTime.UtcNow
        };

        _db.Posts.Add(post);

        // Create PostMedia entries
        if (request.MediaUrls is { Count: > 0 })
        {
            for (int i = 0; i < request.MediaUrls.Count; i++)
            {
                var mediaType = request.PostType == PostType.Video ? "video" : "photo";
                _db.PostMedias.Add(new PostMedia
                {
                    Id                = Guid.NewGuid(),
                    PostId            = post.Id,
                    MediaUrl          = request.MediaUrls[i],
                    MediaType         = mediaType,
                    CloudinaryPublicId = request.MediaPublicIds != null && i < request.MediaPublicIds.Count
                        ? request.MediaPublicIds[i]
                        : null
                });
            }
        }

        // Pre-seed manual student tags if provided
        if (request.TargetStudentIds is { Count: > 0 })
        {
            foreach (var studentId in request.TargetStudentIds)
            {
                _db.PostStudentTags.Add(new PostStudentTag
                {
                    PostId      = post.Id,
                    StudentId   = studentId,
                    IsConfirmed = false
                });
            }
        }

        await _db.SaveChangesAsync();

        // Enqueue face recognition if post has media
        if (request.MediaUrls is { Count: > 0 })
        {
            BackgroundJob.Enqueue<FaceRecognitionJobRunner>(
                runner => runner.RunAsync(post.Id, request.ClassId));
        }

        return CreatedAtAction(nameof(GetPost), new { id = post.Id }, new { id = post.Id });
    }

    // GET /api/posts/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetPost(Guid id)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();
        var role     = GetRole();

        var post = await _db.Posts
            .Include(p => p.Teacher)
            .Include(p => p.Media)
            .Include(p => p.StudentTags).ThenInclude(t => t.Student)
            .FirstOrDefaultAsync(p => p.Id == id && p.Teacher.SchoolId == schoolId);

        if (post is null)
            return NotFound();

        if (role == "Teacher")
        {
            if (post.TeacherId != userId)
                return Forbid();
            return Ok(MapToDto(post));
        }

        if (role == "Parent")
        {
            if (!post.IsPublished)
                return NotFound();

            var childIds = await _db.StudentParents
                .Where(sp => sp.ParentId == userId)
                .Select(sp => sp.StudentId)
                .ToListAsync();

            if (!post.StudentTags.Any(t => childIds.Contains(t.StudentId)))
                return Forbid();

            return Ok(MapToDto(post));
        }

        return Forbid();
    }

    // PUT /api/posts/{id}/confirm-tags
    [HttpPut("{id:guid}/confirm-tags")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> ConfirmTags(Guid id, [FromBody] ConfirmTagsRequest request)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();

        var post = await _db.Posts
            .Include(p => p.Teacher)
            .Include(p => p.StudentTags)
            .FirstOrDefaultAsync(p => p.Id == id && p.TeacherId == userId && p.Teacher.SchoolId == schoolId);

        if (post is null)
            return NotFound();

        // Update existing tags confirmation status
        foreach (var confirmedTag in request.ConfirmedTags)
        {
            var existing = post.StudentTags.FirstOrDefault(t => t.StudentId == confirmedTag.StudentId);
            if (existing is not null)
                existing.IsConfirmed = confirmedTag.IsConfirmed;
        }

        // Add newly manually tagged students (if not already present)
        if (request.AdditionalStudentIds is { Count: > 0 })
        {
            foreach (var studentId in request.AdditionalStudentIds)
            {
                var alreadyTagged = post.StudentTags.Any(t => t.StudentId == studentId);
                if (!alreadyTagged)
                {
                    _db.PostStudentTags.Add(new PostStudentTag
                    {
                        PostId      = id,
                        StudentId   = studentId,
                        IsConfirmed = true
                    });
                }
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Tags updated." });
    }

    // POST /api/posts/{id}/publish
    [HttpPost("{id:guid}/publish")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> PublishPost(Guid id)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();

        var post = await _db.Posts
            .Include(p => p.Teacher)
            .Include(p => p.StudentTags).ThenInclude(t => t.Student).ThenInclude(s => s.StudentParents)
            .FirstOrDefaultAsync(p => p.Id == id && p.TeacherId == userId && p.Teacher.SchoolId == schoolId);

        if (post is null)
            return NotFound();

        if (post.IsPublished)
            return BadRequest(new { message = "Post is already published." });

        post.IsPublished = true;
        await _db.SaveChangesAsync();

        // Collect parent user IDs from tagged students
        var parentIds = post.StudentTags
            .SelectMany(t => t.Student.StudentParents)
            .Select(sp => sp.ParentId)
            .Distinct()
            .ToList();

        // Fetch FCM tokens and log (actual FCM sending to be wired later)
        if (parentIds.Count > 0)
        {
            var fcmTokens = await _db.Users
                .Where(u => parentIds.Contains(u.Id) && u.FcmToken != null)
                .Select(u => u.FcmToken!)
                .ToListAsync();

            foreach (var token in fcmTokens)
            {
                _logger.LogInformation(
                    "[FCM] Would send push to token {Token}: Post published in class {ClassId}",
                    token, post.ClassId);
                // TODO: await _firebaseService.SendAsync(token, "New post published", post.Caption ?? "");
            }
        }

        return Ok(new { message = "Post published." });
    }

    // DELETE /api/posts/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<IActionResult> DeletePost(Guid id)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();
        var role     = GetRole();

        var post = await _db.Posts
            .Include(p => p.Teacher)
            .FirstOrDefaultAsync(p => p.Id == id && p.Teacher.SchoolId == schoolId);

        if (post is null)
            return NotFound();

        // Teacher can only delete their own posts; Admin can delete any
        if (role == "Teacher" && post.TeacherId != userId)
            return Forbid();

        _db.Posts.Remove(post);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static PostDto MapToDto(Post p) => new(
        p.Id,
        p.TeacherId,
        p.Teacher.FullName,
        p.ClassId,
        p.Caption,
        p.PostType,
        p.IsPublished,
        p.AiProcessed,
        p.CreatedAt,
        p.Media.Select(m => new PostMediaDto(m.Id, m.MediaUrl, m.MediaType)).ToList(),
        p.StudentTags.Select(t => new PostTagDto(
            t.StudentId,
            t.Student.FullName,
            t.AiConfidence,
            t.IsConfirmed)).ToList()
    );

    private Guid GetUserId()   => HttpContext.Items["UserId"] is Guid g   ? g             : Guid.Empty;
    private Guid GetSchoolId() => HttpContext.Items["SchoolId"] is Guid s ? s             : Guid.Empty;
    private string GetRole()   => HttpContext.Items["Role"] as string      ?? string.Empty;
}

/// <summary>Hangfire job runner stub for face recognition processing.</summary>
public class FaceRecognitionJobRunner
{
    private readonly ILogger<FaceRecognitionJobRunner> _logger;

    public FaceRecognitionJobRunner(ILogger<FaceRecognitionJobRunner> logger)
    {
        _logger = logger;
    }

    public Task RunAsync(Guid postId, Guid classId)
    {
        _logger.LogInformation(
            "[FaceRecognition] Starting face recognition for PostId={PostId}, ClassId={ClassId}",
            postId, classId);
        // TODO: call AI microservice to detect & match faces in post media
        return Task.CompletedTask;
    }
}
