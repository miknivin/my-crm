/* eslint-disable @typescript-eslint/no-explicit-any */
// Interface for validation input
interface LeaveRequestInput {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  durationType:string;
}

export async function validateLeaveRequest({ leaveType, startDate, endDate, reason }: LeaveRequestInput): Promise<void> {
  // Validate required fields
  if (!leaveType || !startDate || !endDate || !reason) {
    const error = new Error('All required fields must be provided');
    (error as any).status = 400;
    throw error;
  }

  // Validate leaveType
  const validLeaveTypes = ['vacation', 'sick', 'personal', 'maternity', 'paternity', 'other'];
  if (!validLeaveTypes.includes(leaveType)) {
    const error = new Error('Invalid leave type');
    (error as any).status = 400;
    throw error;
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    const error = new Error('Invalid date format');
    (error as any).status = 400;
    throw error;
  }
  if (start > end) {
    const error = new Error('Start date must be before end date');
    (error as any).status = 400;
    throw error;
  }
}