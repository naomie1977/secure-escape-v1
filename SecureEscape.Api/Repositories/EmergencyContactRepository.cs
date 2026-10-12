using Microsoft.EntityFrameworkCore;
using SecureEscape.Api.Data;
using SecureEscape.Api.Interfaces;
using SecureEscape.Api.Models;

namespace SecureEscape.Api.Repositories;

public class EmergencyContactRepository : IEmergencyContactRepository
{
    private readonly AppDbContext _context;

    public EmergencyContactRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<EmergencyContact>> GetAllByUserIdAsync(Guid userId)
    {
        return await _context.EmergencyContacts
            .AsNoTracking()
            .Where(x =>
                x.UserId == userId &&
                x.Status == Enums.EmergencyContactStatus.Active &&
                x.NotifyOnDuress)
            .OrderByDescending(x => x.IsPrimary)
            .ThenBy(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task<EmergencyContact?> GetByIdForUserAsync(Guid id, Guid userId)
    {
        return await _context.EmergencyContacts
            .FirstOrDefaultAsync(x =>
                x.Id == id &&
                x.UserId == userId);
    }

    public async Task AddAsync(EmergencyContact contact)
    {
        await _context.EmergencyContacts.AddAsync(contact);
    }

    public Task UpdateAsync(EmergencyContact contact)
    {
        _context.EmergencyContacts.Update(contact);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(EmergencyContact contact)
    {
        _context.EmergencyContacts.Remove(contact);
        return Task.CompletedTask;
    }
}