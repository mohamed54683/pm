"use client";
import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

interface TeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  skills: string[];
}

const skillCategories = [
  { name: 'Frontend', skills: ['React', 'Vue', 'Angular', 'JavaScript', 'TypeScript', 'HTML/CSS'] },
  { name: 'Backend', skills: ['Node.js', 'Python', 'Java', '.NET', 'PHP', 'Go'] },
  { name: 'Database', skills: ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQL Server'] },
  { name: 'DevOps', skills: ['Docker', 'Kubernetes', 'AWS', 'Azure', 'CI/CD', 'Linux'] },
  { name: 'Management', skills: ['Project Management', 'Agile/Scrum', 'Team Leadership', 'Communication'] },
];

export default function SkillsMatrixPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    loadTeamMembers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/resources?includeSkills=true', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        // Mock skills data for demo
        const membersWithSkills = (result.data || []).map((m: TeamMember, idx: number) => ({
          ...m,
          skills: getRandomSkills(idx),
        }));
        setMembers(membersWithSkills);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRandomSkills = (seed: number) => {
    const allSkills = skillCategories.flatMap(c => c.skills);
    const numSkills = 3 + (seed % 5);
    const shuffled = [...allSkills].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numSkills);
  };

  const getSkillLevel = (skill: string, memberIdx: number) => {
    // Mock skill levels for demo
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    return levels[(memberIdx + skill.length) % levels.length];
  };

  const levelColors: Record<string, string> = {
    beginner: 'bg-gray-200',
    intermediate: 'bg-blue-300',
    advanced: 'bg-green-400',
    expert: 'bg-purple-500',
  };

  const allSkills = selectedCategory === 'All' 
    ? skillCategories.flatMap(c => c.skills)
    : skillCategories.find(c => c.name === selectedCategory)?.skills || [];

  return (
    <div>
      <PageBreadcrumb pageTitle="Skills Matrix" />
      
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Team Skills Matrix
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Overview of team members skills and expertise levels
            </p>
          </div>
          
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                selectedCategory === 'All'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              All
            </button>
            {skillCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  selectedCategory === cat.name
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mb-4 flex items-center gap-4 text-xs text-gray-500">
          <span>Skill Levels:</span>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-gray-200"></span> Beginner
          </div>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-blue-300"></span> Intermediate
          </div>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-green-400"></span> Advanced
          </div>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-purple-500"></span> Expert
          </div>
        </div>

        {/* Matrix */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          </div>
        ) : members.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <p>No team members found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="sticky left-0 bg-white px-4 py-3 text-left text-sm font-medium text-gray-900 dark:bg-gray-900 dark:text-white">
                    Team Member
                  </th>
                  {allSkills.slice(0, 10).map((skill) => (
                    <th key={skill} className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                      <span className="block rotate-0 whitespace-nowrap">{skill}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {members.map((member, idx) => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="sticky left-0 bg-white px-4 py-3 dark:bg-gray-900">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{member.job_title || 'Team Member'}</p>
                      </div>
                    </td>
                    {allSkills.slice(0, 10).map((skill) => {
                      const hasSkill = member.skills.includes(skill);
                      const level = hasSkill ? getSkillLevel(skill, idx) : null;
                      return (
                        <td key={skill} className="px-2 py-3 text-center">
                          {hasSkill ? (
                            <span 
                              className={`inline-block h-4 w-4 rounded ${levelColors[level || 'beginner']}`}
                              title={`${skill}: ${level}`}
                            ></span>
                          ) : (
                            <span className="inline-block h-4 w-4 rounded border border-gray-200 dark:border-gray-700"></span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
