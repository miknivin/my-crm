export interface PipelineQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface ValidatedPipelineQuery {
  page: number;
  limit: number;
  search: string;
  createdFrom?: Date;
  createdTo?: Date;
}

export function validatePipelineQueryParams(params: PipelineQueryParams): ValidatedPipelineQuery {

  const page = parseInt(params.page || '1', 10);
  const limit = parseInt(params.limit || '10', 10);

  if (isNaN(page) || page < 1) {
    throw new Error('Page must be a positive integer');
  }
  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw new Error('Limit must be an integer between 1 and 100');
  }

  const search = params.search?.trim() || '';

  let createdFrom: Date | undefined;
  let createdTo: Date | undefined;

  if (params.createdFrom) {
    createdFrom = new Date(params.createdFrom);
    if (isNaN(createdFrom.getTime())) {
      throw new Error('Invalid createdFrom date format');
    }
  }

  if (params.createdTo) {
    createdTo = new Date(params.createdTo);
    if (isNaN(createdTo.getTime())) {
      throw new Error('Invalid createdTo date format');
    }
    createdTo.setHours(23, 59, 59, 999);
  }

  return {
    page,
    limit,
    search,
    createdFrom,
    createdTo,
  };
}
