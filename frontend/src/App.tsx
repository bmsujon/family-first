import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AppDispatch } from './store/store';
import { loadUser } from './features/auth/authSlice';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CreateFamilyPage from './pages/CreateFamilyPage';
import HomeHandler from './components/HomeHandler'; // Import the handler
import RequireAuth from './components/RequireAuth'; // Import RequireAuth
import Layout from './components/Layout'; // Import the Layout component
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'; // Import MUI components for basic styling
import TaskDetail from './features/tasks/TaskDetail'; // Import the TaskDetail component
import AcceptInvitePage from './pages/AcceptInvitePage'; // Import the new page
import FamilyDashboardPage from './pages/FamilyDashboardPage'; // Import the new dashboard page
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// TODO: Define a proper theme later
const theme = createTheme({
  palette: {
    primary: {
      main: '#1a237e', // Example: Indigo dark
    },
    secondary: {
      main: '#ffab00', // Example: Amber accent
    },
    // You can also define mode: 'dark' for dark mode
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600, // Make H4 slightly bolder
    },
    // Add other typography customizations here
  },
  // Add component overrides or other theme options here
  components: {
    MuiButton: {
      styleOverrides: {
        root: { // Example: Slightly rounded buttons
          borderRadius: 8,
        },
      },
    },
  },
});

// Placeholder for the main authenticated part of the app (now inside HomeHandler)
// const DashboardPlaceholder: React.FC = () => <h1>Dashboard Placeholder</h1>;

// TODO: Create a RequireAuth component for cleaner protected routing

function App() {
  const dispatch = useDispatch<AppDispatch>();

  // Dispatch loadUser on initial application mount
  useEffect(() => {
    console.log('[App useEffect] Dispatching loadUser...');
    dispatch(loadUser());
  }, [dispatch]); // Run only once on mount

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline /> { /* Apply baseline MUI styles */ }
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />

          {/* Protected routes wrapped by Layout */}
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}> { /* Apply Layout to protected routes */}
              {/* Child routes rendered within Layout's Outlet */}
              <Route index element={<HomeHandler />} /> { /* Render HomeHandler at / */}
              <Route path="create-family" element={<CreateFamilyPage />} />
              <Route path="/families/:familyId/dashboard" element={<FamilyDashboardPage />} />
              <Route path="/families/:familyId/tasks/:taskId" element={<TaskDetail />} />
              {/* Add other protected routes here later */}
              {/* Example: <Route path="dashboard" element={<DashboardPage />} /> */}
            </Route>
          </Route>

          {/* Optional: Add a 404 Not Found route */}
          {/* <Route path="*" element={<NotFoundPage />} /> */}

        </Routes>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
