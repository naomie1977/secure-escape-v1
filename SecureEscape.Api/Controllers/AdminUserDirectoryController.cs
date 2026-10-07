using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureEscape.Api.Data;
using SecureEscape.Api.DTOs.Response;
using SecureEscape.Api.Enums;
using SecureEscape.Api.Interfaces;

namespace SecureEscape.Api.Controllers;

[ApiController]
[Authorize(Roles = "SecureEscapeAdmin,SystemAdmin")]
[Route("api/v1/admin/user-directory")]
public class AdminUserDirectoryController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentAdminService _currentAdminService;

    public AdminUserDirectoryController(
        AppDbContext context,
        ICurrentAdminService currentAdminService)
    {
        _context = context;
        _currentAdminService = currentAdminService;
    }

    [HttpGet]
    public async Task<ActionResult<AdminUsersResponseDto>> GetUserDirectory()
    {
        var currentAdmin = _currentAdminService.GetCurrentAdmin();

        var allowedRoles = new[]
        {
            "SecureEscapeAdmin",
            "SystemAdmin"
        };

        if (!allowedRoles.Contains(currentAdmin.AdminRole))
        {
            return Forbid();
        }

        var secureEscapeUsers = await _context.Users
            .AsNoTracking()
            .Where(user => user.SecureEscapeEnrollment != null)
            .Select(user => new SecureEscapeUserResponseDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber,
                UserStatus = user.Status.ToString(),

                BankIntegrationId = user.BankIntegrationId,

                BankName = user.BankIntegration != null
                    ? user.BankIntegration.BankName
                    : "Unknown Bank",

                BankCode = user.BankIntegration != null
                    ? user.BankIntegration.BankCode
                    : string.Empty,

                EnrollmentStatus =
                    user.SecureEscapeEnrollment != null
                        ? user.SecureEscapeEnrollment.Status.ToString()
                        : SecureEscapeEnrollmentStatus.SetupInProgress.ToString(),

                EnrollmentStartedAt =
                    user.SecureEscapeEnrollment != null
                        ? user.SecureEscapeEnrollment.StartedAt
                        : null,

                EnrollmentActivatedAt =
                    user.SecureEscapeEnrollment != null
                        ? user.SecureEscapeEnrollment.ActivatedAt
                        : null,

                HasActiveSession = user.Sessions.Any(
                    session =>
                        session.Status == SessionStatus.Active),

                LastActivityAt = user.Sessions
                    .OrderByDescending(session => session.LastActivityAt)
                    .Select(session => (DateTime?)session.LastActivityAt)
                    .FirstOrDefault(),

                CreatedAt = user.CreatedAt
            })
            .OrderBy(user => user.FullName)
            .ToListAsync();

        var staffUsers = await _context.AdminUsers
            .AsNoTracking()
            .Select(admin => new StaffUserResponseDto
            {
                Id = admin.Id,
                FullName = admin.FullName,
                Email = admin.Email,
                Role = admin.AdminRole.ToString(),
                ActivityStatus = admin.ActivityStatus.ToString(),

                BankIntegrationId = admin.BankIntegrationId,

                BankName = admin.BankIntegration != null
                    ? admin.BankIntegration.BankName
                    : null,

                BankCode = admin.BankIntegration != null
                    ? admin.BankIntegration.BankCode
                    : null,

                CreatedAt = admin.CreatedAt,
                UpdatedAt = admin.UpdatedAt
            })
            .OrderBy(admin => admin.FullName)
            .ToListAsync();

        var response = new AdminUsersResponseDto
        {
            SecureEscapeUsers = secureEscapeUsers,
            StaffUsers = staffUsers
        };

        return Ok(response);
    }
}