import { JSX, useEffect, useRef, useState } from "react";

interface DateRangePickerUiProps {
  label?: string;
  placeholder?: string;
  containerClassName?: string;
  inputClassName?: string;
  calendarClassName?: string;
  startDate: string | null;
  endDate: string | null;
  setStartDate: (date: string | null) => void;
  setEndDate: (date: string | null) => void;
  onApply?: (dates: { startDate: string | null; endDate: string | null }) => void;
  onCancel?: () => void;
}

export default function DateRangePickerUi({
  label = "Select Created at Date Range",
  placeholder = "Pick a date",
  containerClassName = "",
  inputClassName = "",
  calendarClassName = "",
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  onApply = () => {},
  onCancel = () => {},
}: DateRangePickerUiProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const datepickerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysArray: JSX.Element[] = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      daysArray.push(<div key={`empty-${i}`} className="w-[46px] h-[46px]"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const day = new Date(year, month, i);
      const dayString = day.toLocaleDateString("en-US");
      let className =
        "flex items-center justify-center cursor-pointer w-[38px] h-[38px] rounded-full text-gray-600 dark:text-gray-400 hover:bg-blue-500 hover:text-white transition-colors";

      if (startDate && dayString === startDate) {
        className += " bg-blue-500 text-white dark:text-white rounded-r-none";
      }
      if (endDate && dayString === endDate) {
        className += " bg-blue-500 text-white dark:text-white rounded-l-none";
      }
      if (
        startDate &&
        endDate &&
        new Date(day) > new Date(startDate) &&
        new Date(day) < new Date(endDate)
      ) {
        className += " bg-gray-200 dark:bg-gray-700 rounded-none";
      }

      daysArray.push(
        <div
          key={i}
          className={className}
          data-date={dayString}
          onClick={() => handleDayClick(day)}
        >
          {i}
        </div>
      );
    }

    return daysArray;
  };

  const handleDayClick = (selectedDay: Date) => {
    const dayString = selectedDay.toLocaleDateString("en-US");

    if (!startDate || (startDate && endDate)) {
      setStartDate(dayString);
      setEndDate(null);
    } else {
      if (new Date(selectedDay) < new Date(startDate)) {
        setEndDate(startDate);
        setStartDate(dayString);
      } else {
        setEndDate(dayString);
      }
    }
  };

  const updateInput = () => {
    if (startDate && endDate) {
      return `${startDate} - ${endDate}`;
    } else if (startDate) {
      return startDate;
    }
    return placeholder;
  };

  const toggleDatepicker = () => {
    setIsOpen(!isOpen);
  };

  const handleApply = () => {
    onApply({ startDate, endDate });
    setIsOpen(false);
  };

  const handleCancel = () => {
    setStartDate(null);
    setEndDate(null);
    onCancel();
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datepickerRef.current && !datepickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${containerClassName}`} ref={datepickerRef}>
      <label className="mb-2 block text-sm font-medium text-gray-800 dark:text-white">
        {label}
      </label>
      <div className="relative flex items-center">
        <span className="absolute left-0 pl-4 text-gray-500 dark:text-gray-400">
          <svg
            className="fill-current"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17.5 3.3125H15.8125V2.625C15.8125 2.25 15.5 1.90625 15.0937 1.90625C14.6875 1.90625 14.375 2.21875 14.375 2.625V3.28125H5.59375V2.625C5.59375 2.25 5.28125 1.90625 4.875 1.90625C4.46875 1.90625 4.15625 2.21875 4.15625 2.625V3.28125H2.5C1.4375 3.28125 0.53125 4.15625 0.53125 5.25V16.125C0.53125 17.1875 1.40625 18.0937 2.5 18.0937H17.5C18.5625 18.0937 19.4687 17.2187 19.4687 16.125V5.25C19.4687 4.1875 18.5625 3.3125 17.5 3.3125ZM2.5 4.71875H4.1875V5.34375C4.1875 5.71875 4.5 6.0625 4.90625 6.0625C5.3125 6.0625 5.625 5.75 5.625 5.34375V4.71875H14.4687V5.34375C14.4687 5.71875 14.7812 6.0625 15.1875 6.0625C15.5937 6.0625 15.9062 5.75 15.9062 5.34375V4.71875H17.5C17.8125 4.71875 18.0625 4.96875 18.0625 5.28125V7.34375H1.96875V5.28125C1.9375 4.96875 2.15625 4.75 2.46875 4.75H17.5C17.8125 4.75 18.0625 4.96875 18.0625 5.28125V7.34375H1.96875V5.28125C1.96875 4.9375 2.1875 4.71875 2.5 4.71875ZM17.5 16.6562H2.5C2.1875 16.6562 1.9375 16.4062 1.9375 16.0937V8.71875H18.0312V16.125C18.0625 16.4375 17.8125 16.6562 17.5 16.6562Z"
              fill=""
            />
          </svg>
        </span>
        <input
          type="text"
          className={`block w-full p-2.5 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 ${inputClassName}`}
          value={updateInput()}
          onClick={toggleDatepicker}
          readOnly
        />
        <span
          className="absolute right-0 cursor-pointer pr-4 text-gray-500 dark:text-gray-400"
          onClick={toggleDatepicker}
        >
          <svg
            className="fill-current stroke-current"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.29635 5.15354L2.29632 5.15357L2.30055 5.1577L7.65055 10.3827L8.00157 10.7255L8.35095 10.381L13.701 5.10603L13.701 5.10604L13.7035 5.10354C13.722 5.08499 13.7385 5.08124 13.7499 5.08124C13.7613 5.08124 13.7778 5.08499 13.7963 5.10354C13.8149 5.12209 13.8187 5.13859 13.8187 5.14999C13.8187 5.1612 13.815 5.17734 13.7973 5.19552L8.04946 10.8433L8.04945 10.8433L8.04635 10.8464C8.01594 10.8768 7.99586 10.8921 7.98509 10.8992C7.97746 10.8983 7.97257 10.8968 7.96852 10.8952C7.96226 10.8929 7.94944 10.887 7.92872 10.8721L2.20253 5.2455C2.18478 5.22733 2.18115 5.2112 2.18115 5.19999C2.18115 5.18859 2.18491 5.17209 2.20346 5.15354C2.222 5.13499 2.2385 5.13124 2.2499 5.13124C2.2613 5.13124 2.2778 5.13499 2.29635 5.15354Z"
              fill=""
              stroke=""
            />
          </svg>
        </span>
      </div>
      {isOpen && (
        <div
          className={`absolute mt-2 rounded-xl border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 shadow-lg pt-5 z-10 ${calendarClassName}`}
        >
          <div className="flex items-center justify-between px-5">
            <button
              type="button"
              role="button"
              className="rounded-md p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
            >
              <svg
                className="fill-current"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.5312 17.9062C13.3437 17.9062 13.1562 17.8438 13.0312 17.6875L5.96875 10.5C5.6875 10.2187 5.6875 9.78125 5.96875 9.5L13.0312 2.3125C13.3125 2.03125 13.75 2.03125 14.0312 2.3125C14.3125 2.59375 14.3125 3.03125 14.0312 3.3125L7.46875 10L14.0625 16.6875C14.3438 16.9688 14.3438 17.4062 14.0625 17.6875C13.875 17.8125 13.7187 17.9062 13.5312 17.9062Z"
                  fill=""
                />
              </svg>
            </button>
            <div className="text-lg font-medium text-gray-700 dark:text-white">
              {currentDate.toLocaleString("default", { month: "long" })} {currentDate.getFullYear()}
            </div>
            <button
             type="button"
              role="button"
              className="rounded-md p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            >
              <svg
                className="fill-current"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.46875 17.9063C6.28125 17.9063 6.125 17.8438 5.96875 17.7188C5.6875 17.4375 5.6875 17 5.96875 16.7188L12.5312 10L5.96875 3.3125C5.6875 3.03125 5.6875 2.59375 5.96875 2.3125C6.25 2.03125 6.6875 2.03125 6.96875 2.3125L14.0313 9.5C14.3125 9.78125 14.3125 10.2187 14.0313 10.5L6.96875 17.6875C6.84375 17.8125 6.65625 17.9063 6.46875 17.9063Z"
                  fill=""
                />
              </svg>
            </button>
          </div>
          <div className="mb-4 mt-6 grid grid-cols-7 gap-2 px-5">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-y-0.5 px-5">{renderCalendar()}</div>
          <div className="mt-2 flex justify-end space-x-2.5 border-t border-gray-300 dark:border-gray-600 p-5">
            <button
             type="button"
              role="button"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-center text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              role="button"
              className="px-4 py-2 flex items-center justify-center text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
              onClick={handleApply}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}