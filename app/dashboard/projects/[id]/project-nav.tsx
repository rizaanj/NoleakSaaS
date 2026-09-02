"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface ProjectNavProps {
  projectId: string;
  projectName: string;
  hasCredentials: boolean;
  hasPriorRuns: boolean;
  // If the "Run Again" form lives on this page, we render the form trigger.
  // Otherwise we just link back to the project page where Run Again lives.
  runForm?: React.ReactNode;
}

export default function ProjectNav({
  projectId,
  projectName,
  hasCredentials,
  hasPriorRuns,
  runForm,
}: ProjectNavProps) {
  const pathname = usePathname();

  const tabs = [
    { label: "Project", href: `/dashboard/projects/${projectId}` },
    { label: "Setup", href: `/dashboard/projects/${projectId}/setup` },
    { label: "Results", href: `/dashboard/projects/${projectId}/results` },
  ];

  function isActive(href: string) {
    if (href === `/dashboard/projects/${projectId}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        {/* Left: project name + back */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-gray-700"
          >
            Projects
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-900">
            {projectName}
          </span>
        </div>

        {/* Right: Run Again / Run Tests button (on project page only) */}
        {runForm}
      </div>

      {/* Tabs */}
      <div className="mx-auto flex max-w-2xl gap-0 px-4">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              isActive(tab.href)
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
