'use client';

import React from 'react';
import TimelineItem from './TimeLineItem';
import { ResponseActivity } from './../../../app/redux/api/contactApi';

interface TimelineProps {
  activities?: ResponseActivity[];
}

const Timeline: React.FC<TimelineProps> = ({ activities }) => {
  const sortedActivities = activities
    ? [...activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  return (
    <ol className="relative border-s border-gray-200 dark:border-gray-700">
      {sortedActivities.map((activity, index) => (
        <TimelineItem
          key={index}
          activity={activity}
        />
      ))}
    </ol>
  );
};

export default Timeline;