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
[Route("api/v1/admin/platform")]
public class AdminPlatformController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentAdminService _currentAdminService;

    public AdminPlatformController(
        AppDbContext context,
        ICurrentAdminService currentAdminService)
    {
        _context = context;
        _currentAdminService = currentAdminService;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<AdminPlatformStatsResponseDto>> GetPlatformStats()
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

        var bankIntegrations = await _context.BankIntegrations
            .AsNoTracking()
            .OrderBy(bank => bank.BankName)
            .ToListAsync();

        var totalUsers = await _context.Users
            .AsNoTracking()
            .CountAsync();

        var duressSessionsQuery = _context.UserSessions
            .AsNoTracking()
            .Where(session => session.Mode == SessionMode.Duress);

        var totalDuressSessions =
            await duressSessionsQuery.CountAsync();

        var activeSessions =
            await duressSessionsQuery.CountAsync(
                session => session.Status == SessionStatus.Active);

        var resolvedCases =
            await duressSessionsQuery.CountAsync(
                session => session.CaseStatus == CaseStatus.Resolved);

        var highRiskEvents = await _context.Alerts
            .AsNoTracking()
            .CountAsync(alert =>
                alert.Severity == RiskLevel.High ||
                alert.Severity == RiskLevel.Critical);

        var bankStats = new List<AdminBankStatsResponseDto>();

        foreach (var bank in bankIntegrations)
        {
            var registeredUsers = await _context.Users
                .AsNoTracking()
                .CountAsync(user =>
                    user.BankIntegrationId == bank.Id);

            var bankDuressSessions = _context.UserSessions
                .AsNoTracking()
                .Where(session =>
                    session.Mode == SessionMode.Duress &&
                    session.User != null &&
                    session.User.BankIntegrationId == bank.Id);

            var bankDuressSessionCount =
                await bankDuressSessions.CountAsync();

            var bankActiveSessions =
                await bankDuressSessions.CountAsync(
                    session =>
                        session.Status == SessionStatus.Active);

            var bankResolvedCases =
                await bankDuressSessions.CountAsync(
                    session =>
                        session.CaseStatus == CaseStatus.Resolved);

            var bankHighRiskEvents = await _context.Alerts
                .AsNoTracking()
                .CountAsync(alert =>
                    alert.User != null &&
                    alert.User.BankIntegrationId == bank.Id &&
                    (alert.Severity == RiskLevel.High ||
                     alert.Severity == RiskLevel.Critical));

            bankStats.Add(new AdminBankStatsResponseDto
            {
                BankIntegrationId = bank.Id,
                BankName = bank.BankName,
                BankCode = bank.BankCode,
                Status = bank.Status.ToString(),
                RegisteredUsers = registeredUsers,
                DuressSessions = bankDuressSessionCount,
                ActiveSessions = bankActiveSessions,
                ResolvedCases = bankResolvedCases,
                HighRiskEvents = bankHighRiskEvents
            });
        }

        var response = new AdminPlatformStatsResponseDto
        {
            ConnectedBanks = bankIntegrations.Count,
            TotalUsers = totalUsers,
            TotalDuressSessions = totalDuressSessions,
            ActiveSessions = activeSessions,
            ResolvedCases = resolvedCases,
            HighRiskEvents = highRiskEvents,
            Banks = bankStats
        };

        return Ok(response);
    }
}