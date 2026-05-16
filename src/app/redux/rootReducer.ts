import { combineReducers } from "redux";

import { userApi } from "./api/userApi";
import { authApi } from "./api/authApi";
import { userSlice } from "./features/authSlice";
import { contactApi } from "./api/contactApi";
import { pipelineApi } from "./api/pipelineApi";
import { calenderApi } from "./api/calenderApi";
import { dashboardApi } from "./api/dashboardApi";
import { serviceApi } from "./api/serviceApi";
import { proposalApi } from "./api/proposalApi";
import { aiReportApi } from "./api/aiReportApi";

const rootReducer = combineReducers({
  user: userSlice.reducer,
  [userApi.reducerPath]: userApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [contactApi.reducerPath]: contactApi.reducer,
  [pipelineApi.reducerPath]: pipelineApi.reducer,
  [calenderApi.reducerPath]:calenderApi.reducer,
  [dashboardApi.reducerPath]:dashboardApi.reducer,
  [serviceApi.reducerPath]: serviceApi.reducer,
  [proposalApi.reducerPath]: proposalApi.reducer,
  [aiReportApi.reducerPath]: aiReportApi.reducer
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
