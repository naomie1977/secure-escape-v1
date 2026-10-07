using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureEscape.Api.Data;
using SecureEscape.Api.DTOs.Response;
using SecureEscape.Api.Interfaces;

namespace SecureEscape.Api.Controllers;

[ApiController]
[Authorize(Roles = "FraudManager,SystemAdmin,SecureEscapeAdmin")]
[Route("api/v1/admin/audit-logs")]
public class AdminAuditLogsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentAdminService _currentAdminService;

    public AdminAuditLogsController(
        AppDbContext context,
        ICurrentAdminService currentAdminService)
    {
        _context = context;
        _currentAdminService = currentAdminService;
    }

    [HttpGet]
    public async Task<ActionResult<List<AdminAuditLogResponseDto>>> GetAuditLogs()
    {
        var currentAdmin = _currentAdminService.GetCurrentAdmin();

        var allowedRoles = new[]
        {
            "FraudManager",
            "SystemAdmin",
            "SecureEscapeAdmin"
        };

        if (!allowedRoles.Contains(currentAdmin.AdminRole))
        {
            return Forbid();
        }

        var auditLogs = await _context.AuditLogs
            .AsNoTracking()
            .Include(log => log.User)
            .Include(log => log.AdminUser)
            .OrderByDescending(log => log.CreatedAt)
            .Take(500)
            .Select(log => new AdminAuditLogResponseDto
            {
                Id = log.Id,
                EventType = log.EventType.ToString(),
                EntityType = log.EntityType,
                EntityId = log.EntityId,
                UserId = log.UserId,
                UserName = log.User != null
                    ? log.User.FullName
                    : null,
                UserSessionId = log.UserSessionId,
                AdminUserId = log.AdminUserId,
                AdminName = log.AdminUser != null
                    ? log.AdminUser.FullName
                    : null,
                Actor = log.AdminUser != null
                    ? log.AdminUser.FullName
                    : log.User != null
                        ? log.User.FullName
                        : "System",
                MetadataJson = log.MetadataJson,
                CreatedAt = log.CreatedAt
            })
            .ToListAsync();

        return Ok(auditLogs);
    }
}