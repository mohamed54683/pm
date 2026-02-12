"use client";
import React, { useState, useEffect } from "react";

interface CalendarEvent {
  id: number;
  type: 'task' | 'milestone' | 'meeting' | 'deadline';
  title: string;
  date: string;
  end_date?: string;
  project_name?: string;
  project_code?: string;
  status?: string;
  priority?: string;
  assignee?: string;
}

const eventTypeColors: Record<string, string> = {
  task: 'bg-blue-500',
  milestone: 'bg-purple-500',
  meeting: 'bg-green-500',
  deadline: 'bg-red-500',
};

const priorityColors: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-amber-500',
  low: 'border-l-green-500',
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      // Get the first and last day of current view
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const params = new URLSearchParams({
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      });
      
      // Fetch tasks as calendar events
      const response = await fetch(`/api/tasks?${params}&limit=200`, { credentials: 'include' });
      const result = await response.json();
      
      if (result.success) {
        const calendarEvents: CalendarEvent[] = result.data.map((task: { id: number; title: string; planned_end_date: string; planned_start_date: string; project_name: string; project_code: string; status: string; priority: string; assignee_first_name: string; assignee_last_name: string }) => ({
          id: task.id,
          type: 'task',
          title: task.title,
          date: task.planned_end_date || task.planned_start_date,
          project_name: task.project_name,
          project_code: task.project_code,
          status: task.status,
          priority: task.priority,
          assignee: task.assignee_first_name ? `${task.assignee_first_name} ${task.assignee_last_name}` : undefined,
        }));
        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Calendar</h1>
            <p className="page-subtitle">
              View tasks and deadlines
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300'
                }`}
              >
                Week
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Navigation */}
        <div className="mb-6 flex items-center justify-between rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateMonth(-1)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="card-title text-xl">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="ml-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-blue-500"></span>
              <span className="text-xs text-gray-500">Task</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-purple-500"></span>
              <span className="text-xs text-gray-500">Milestone</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500"></span>
              <span className="text-xs text-gray-500">Deadline</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          </div>
        ) : (
          <div className="card">
            {/* Week Day Headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="border-r border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm font-medium text-gray-700 last:border-r-0 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-300"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {days.map((date, index) => {
                const dayEvents = date ? getEventsForDate(date) : [];
                const isCurrentDay = date && isToday(date);
                const isSelected = date && selectedDate && date.toDateString() === selectedDate.toDateString();
                
                return (
                  <div
                    key={index}
                    onClick={() => date && setSelectedDate(date)}
                    className={`min-h-[120px] border-b border-r border-gray-200 p-2 last:border-r-0 dark:border-gray-700 ${
                      date ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : 'bg-gray-50 dark:bg-gray-800'
                    } ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  >
                    {date && (
                      <>
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                              isCurrentDay
                                ? 'bg-blue-600 font-bold text-white'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {date.getDate()}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="text-xs text-gray-500">{dayEvents.length}</span>
                          )}
                        </div>
                        <div className="mt-1 space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              className={`rounded border-l-2 bg-gray-100 px-1.5 py-0.5 text-xs truncate dark:bg-gray-700 ${
                                priorityColors[event.priority || 'medium'] || 'border-l-gray-400'
                              }`}
                              title={`${event.title} - ${event.project_name}`}
                            >
                              <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${eventTypeColors[event.type]}`}></span>
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <p className="text-xs text-gray-500">+{dayEvents.length - 3} more</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Date Events */}
        {selectedDate && (
          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
              Events for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h3>
            
            {getEventsForDate(selectedDate).length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No events scheduled for this day</p>
            ) : (
              <div className="space-y-3">
                {getEventsForDate(selectedDate).map((event) => (
                  <div
                    key={event.id}
                    className={`rounded-lg border-l-4 bg-gray-50 p-4 dark:bg-gray-700 ${
                      priorityColors[event.priority || 'medium'] || 'border-l-gray-400'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${eventTypeColors[event.type]}`}></span>
                          <span className="text-xs font-medium uppercase text-gray-500">{event.type}</span>
                        </div>
                        <h4 className="mt-1 font-medium text-gray-900 dark:text-white">{event.title}</h4>
                        {event.project_name && (
                          <p className="text-sm text-gray-500">{event.project_code} - {event.project_name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {event.status && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {event.status.replace('_', ' ')}
                          </span>
                        )}
                        {event.assignee && (
                          <p className="mt-1 text-xs text-gray-500">{event.assignee}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
