import React from 'react';
import { format, isToday, isYesterday, isThisYear, isSameDay } from 'date-fns';

const DateSeparator = ({ date, previousDate }) => {
  const messageDate = new Date(date);
  let formattedDate;
  
  // If previous date is provided and it's the same day, show only time
  if (previousDate && isSameDay(new Date(previousDate), messageDate)) {
    return null; // Don't show any separator for same-day messages
  }
  
  if (isToday(messageDate)) {
    return null; // Don't show any separator for today's messages
  } else if (isYesterday(messageDate)) {
    formattedDate = 'Yesterday';
  } else if (isThisYear(messageDate)) {
    formattedDate = format(messageDate, 'EEEE, MMMM d');
  } else {
    formattedDate = format(messageDate, 'EEEE, MMMM d, yyyy');
  }
  
  return (
    <div className="w-full flex justify-center my-4">
      <div className="bg-gray-100 dark:bg-gray-700 px-4 py-1.5 rounded-full">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {formattedDate}
        </span>
      </div>
    </div>
  );
};

export default DateSeparator;
