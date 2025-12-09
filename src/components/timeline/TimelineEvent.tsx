/**
 * TIMELINE EVENT COMPONENT
 * Représente un événement sur la timeline
 */

'use client';

interface TimelineEventProps {
  id: string;
  date: string;
  title: string;
  description: string;
  location?: string;
  people?: string[];
}

export default function TimelineEvent({
  date,
  title,
  description,
  location,
  people,
}: TimelineEventProps) {
  return (
    <div className="border-l-4 border-purple-500 pl-4 py-2">
      <div className="text-sm text-gray-500">{date}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-gray-700">{description}</p>
      {location && (
        <div className="text-sm text-gray-500 mt-1">📍 {location}</div>
      )}
      {people && people.length > 0 && (
        <div className="text-sm text-gray-500 mt-1">
          👥 {people.join(', ')}
        </div>
      )}
    </div>
  );
}
