import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import Layout from "../../components/Layout";
import {
  getAdminUserDirectory,
  type SecureEscapeUser,
  type StaffUser,
} from "../../services/adminUserDirectoryService";

type DirectoryView = "customers" | "staff";

function formatDate(value: string | null) {
  if (!value) {
    return "No activity yet";
  }

  return new Date(value).toLocaleString();
}

function formatRole(role: string) {
  switch (role) {
    case "FraudAnalyst":
      return "Fraud Analyst";
    case "FraudManager":
      return "Fraud Manager";
    case "SecureEscapeAdmin":
      return "Secure Escape Admin";
    case "SystemAdmin":
      return "System Admin";
    default:
      return role;
  }
}

function getStatusClasses(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    normalized === "setupinprogress" ||
    normalized === "pending"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function formatEnrollmentStatus(status: string) {
  if (status === "SetupInProgress") {
    return "Setup In Progress";
  }

  return status;
}

export default function AdminUsersPage() {
  const [secureEscapeUsers, setSecureEscapeUsers] = useState<
    SecureEscapeUser[]
  >([]);

  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

  const [activeView, setActiveView] =
    useState<DirectoryView>("customers");

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getAdminUserDirectory();

        setSecureEscapeUsers(data.secureEscapeUsers);
        setStaffUsers(data.staffUsers);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load the user directory.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchUsers();
  }, []);

  const filteredSecureEscapeUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return secureEscapeUsers;
    }

    return secureEscapeUsers.filter((user) =>
      [
        user.fullName,
        user.email,
        user.phoneNumber,
        user.bankName,
        user.bankCode,
        user.userStatus,
        user.enrollmentStatus,
      ].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [searchTerm, secureEscapeUsers]);

  const filteredStaffUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return staffUsers;
    }

    return staffUsers.filter((user) =>
      [
        user.fullName,
        user.email,
        user.role,
        user.activityStatus,
        user.bankName ?? "",
        user.bankCode ?? "",
      ].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [searchTerm, staffUsers]);

  const activeCustomerCount = secureEscapeUsers.filter(
    (user) => user.hasActiveSession,
  ).length;

  const activeEnrollmentCount = secureEscapeUsers.filter(
    (user) => user.enrollmentStatus === "Active",
  ).length;

  const activeStaffCount = staffUsers.filter(
    (user) =>
      user.activityStatus.toLowerCase() === "active",
  ).length;

  const handleViewChange = (view: DirectoryView) => {
    setActiveView(view);
    setSearchTerm("");
  };

  return (
    <Layout>
      <div className="mx-auto max-w-[1440px] space-y-6">
        <section className="relative overflow-hidden rounded-xl border border-[#163E61] bg-[#102F4A] px-6 py-6 shadow-[0_12px_32px_rgba(15,47,74,0.14)] lg:px-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-2 -top-8 h-36 w-36 rounded-full border border-white/10" />

          <div className="relative">
            <div className="mb-3 flex items-center gap-2 text-blue-200">
              <ShieldCheck size={17} />

              <span className="text-[11px] font-bold uppercase tracking-[0.15em]">
                Access Administration
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[28px]">
              Users & Access
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Review customers enrolled in Secure Escape and
              administrative staff with access to the Secure
              Escape platform.
            </p>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="relative overflow-hidden rounded-lg border border-[#D6E1EA] bg-white p-5 shadow-[0_4px_14px_rgba(15,47,74,0.05)]">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-[#1769AA]" />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                  Secure Escape Users
                </p>

                <p className="mt-2 text-3xl font-bold tracking-tight text-[#102A43]">
                  {loading ? "..." : secureEscapeUsers.length}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Customers who have started Secure Escape
                  enrollment.
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#1769AA]">
                <UserRound size={19} />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg border border-[#D6E1EA] bg-white p-5 shadow-[0_4px_14px_rgba(15,47,74,0.05)]">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-emerald-500" />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                  Active Enrollments
                </p>

                <p className="mt-2 text-3xl font-bold tracking-tight text-[#102A43]">
                  {loading ? "..." : activeEnrollmentCount}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Customers with an active Secure Escape
                  enrollment.
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck size={19} />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg border border-[#D6E1EA] bg-white p-5 shadow-[0_4px_14px_rgba(15,47,74,0.05)]">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-violet-500" />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                  Staff Accounts
                </p>

                <p className="mt-2 text-3xl font-bold tracking-tight text-[#102A43]">
                  {loading ? "..." : staffUsers.length}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Administrative accounts registered on the
                  platform.
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <UsersRound size={19} />
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-[#D5E1EB] bg-white shadow-[0_7px_22px_rgba(15,47,74,0.06)]">
          <div className="border-b border-[#DFE8EF] bg-[#F8FBFD] px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  handleViewChange("customers")
                }
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  activeView === "customers"
                    ? "bg-[#102F4A] text-white shadow-sm"
                    : "border border-[#D5E1EB] bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <UserRound size={16} />
                Secure Escape Users
              </button>

              <button
                type="button"
                onClick={() => handleViewChange("staff")}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  activeView === "staff"
                    ? "bg-[#102F4A] text-white shadow-sm"
                    : "border border-[#D5E1EB] bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <UsersRound size={16} />
                Staff Users
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-b border-[#DFE8EF] bg-gradient-to-r from-[#F3F8FC] to-white px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#1769AA]">
                {activeView === "customers"
                  ? "Customer Directory"
                  : "Staff Directory"}
              </p>

              <h2 className="mt-1 text-base font-bold text-[#102A43]">
                {activeView === "customers"
                  ? "Secure Escape Users"
                  : "Administrative Staff"}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {activeView === "customers"
                  ? `${activeCustomerCount} customer${
                      activeCustomerCount === 1 ? "" : "s"
                    } currently have an active session.`
                  : `${activeStaffCount} staff account${
                      activeStaffCount === 1 ? "" : "s"
                    } currently have active account status.`}
              </p>
            </div>

            <div className="relative w-full lg:w-[340px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder={
                  activeView === "customers"
                    ? "Search customer, bank or email"
                    : "Search staff, role or email"
                }
                className="w-full rounded-lg border border-[#D5E1EB] bg-white py-2.5 pl-9 pr-3 text-sm text-[#102A43] outline-none transition placeholder:text-slate-400 focus:border-[#1769AA] focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-14 text-center">
              <p className="text-sm text-slate-500">
                Loading user directory...
              </p>
            </div>
          ) : activeView === "customers" ? (
            filteredSecureEscapeUsers.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <UserRound
                    size={22}
                    className="text-slate-400"
                  />
                </div>

                <p className="mt-3 text-sm font-semibold text-[#102A43]">
                  No Secure Escape users found
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  No enrolled customers match your current
                  search.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-[#DCE6EE] bg-[#F4F8FB]">
                      <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        Customer
                      </th>

                      <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        Contact
                      </th>

                      <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        Bank
                      </th>

                      <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        Enrollment
                      </th>

                      <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        Account
                      </th>

                      <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        Session
                      </th>

                      <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        Last Activity
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSecureEscapeUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-[#E7EEF4] last:border-b-0 hover:bg-[#F8FBFD]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF4FB] text-[#1769AA]">
                              <UserRound size={17} />
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-[#102A43]">
                                {user.fullName}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                Secure Escape customer
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm text-slate-600">
                            {user.email}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {user.phoneNumber ||
                              "No phone number"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Building2
                              size={15}
                              className="text-slate-400"
                            />

                            <div>
                              <p className="text-sm font-medium text-slate-700">
                                {user.bankName}
                              </p>

                              {user.bankCode && (
                                <p className="text-xs text-slate-400">
                                  {user.bankCode}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              user.enrollmentStatus,
                            )}`}
                          >
                            {formatEnrollmentStatus(
                              user.enrollmentStatus,
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              user.userStatus,
                            )}`}
                          >
                            {user.userStatus}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {user.hasActiveSession ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Active Session
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                              <span className="h-2 w-2 rounded-full bg-slate-300" />
                              No Active Session
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(user.lastActivityAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : filteredStaffUsers.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <UsersRound
                  size={22}
                  className="text-slate-400"
                />
              </div>

              <p className="mt-3 text-sm font-semibold text-[#102A43]">
                No staff users found
              </p>

              <p className="mt-1 text-xs text-slate-500">
                No administrative accounts match your current
                search.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#DCE6EE] bg-[#F4F8FB]">
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      Staff Member
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      Email
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      Role
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      Bank
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      Account Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStaffUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-[#E7EEF4] last:border-b-0 hover:bg-[#F8FBFD]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                            <ShieldCheck size={17} />
                          </div>

                          <p className="text-sm font-semibold text-[#102A43]">
                            {user.fullName}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {user.email}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-md border border-[#CFE0ED] bg-[#F3F8FC] px-2.5 py-1 text-xs font-semibold text-[#1769AA]">
                          {formatRole(user.role)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {user.bankName ? (
                          <div>
                            <p className="text-sm text-slate-600">
                              {user.bankName}
                            </p>

                            {user.bankCode && (
                              <p className="mt-0.5 text-xs text-slate-400">
                                {user.bankCode}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">
                            Platform-wide
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            user.activityStatus,
                          )}`}
                        >
                          {user.activityStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}