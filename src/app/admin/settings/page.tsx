import { ProfileForm } from "@/components/settings/ProfileForm";

export default function AdminSettingsPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-on-surface">Cài đặt tài khoản</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Quản lý thông tin cá nhân và cài đặt hồ sơ giảng viên.
        </p>
      </div>

      <ProfileForm />
    </div>
  );
}
