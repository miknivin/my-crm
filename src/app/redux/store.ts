import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./rootReducer";
import { authApi } from "./api/authApi";
import { userApi } from "./api/userApi"
import { contactApi } from "./api/contactApi";
import { pipelineApi } from "./api/pipelineApi";
import { calenderApi } from "./api/calenderApi";
import { dashboardApi } from "./api/dashboardApi";
import { serviceApi } from "./api/serviceApi";
import { proposalApi } from "./api/proposalApi";
import { aiReportApi } from "./api/aiReportApi";

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      userApi.middleware, 
      authApi.middleware,
      contactApi.middleware,
      pipelineApi.middleware,
      calenderApi.middleware,
      dashboardApi.middleware,
      serviceApi.middleware,
      proposalApi.middleware,
      aiReportApi.middleware
    ),
});

export default store;
export type AppDispatch = typeof store.dispatch;
export type AppState = ReturnType<typeof store.getState>;
