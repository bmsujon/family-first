import React, { useState } from 'react';
import { Outlet, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    AppBar, Toolbar, Typography, Button, Box, Container, CssBaseline, 
    Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, 
    Divider, IconButton, useTheme, useMediaQuery, CircularProgress, Alert
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import GroupIcon from '@mui/icons-material/Group';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { logout, reset } from '../features/auth/authSlice';
import { useGetMyFamiliesQuery } from '../features/api/apiSlice';
import { Family } from '../types/models';
import { setCurrentFamily } from '../features/family/familySlice';
import NotificationSnackbar from './NotificationSnackbar';

const drawerWidth = 240;

const Layout: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const { token } = useSelector((state: RootState) => state.auth);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);

    const { 
        data: familiesData, 
        isLoading: isLoadingFamilies, 
        isError: isFamiliesError, 
        error: familiesError 
    } = useGetMyFamiliesQuery(undefined, {
        skip: !token,
    });

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleLogout = () => {
        dispatch(logout());
        dispatch(reset()); 
        navigate('/login');
    };

    const handleFamilyClick = (family: Family) => {
        dispatch(setCurrentFamily(family));
        navigate(`/families/${family._id}/dashboard`);
        if (isMobile) {
            setMobileOpen(false);
        }
    };

    const drawerContent = (
        <Box>
            <Toolbar />
            <Divider />
            <List>
                <ListItem disablePadding>
                    <ListItemButton component={RouterLink} to="/">
                        <ListItemIcon><HomeIcon /></ListItemIcon>
                        <ListItemText primary="Dashboard" />
                    </ListItemButton>
                </ListItem>
            </List>
            <Divider />
            <Typography variant="overline" sx={{ pl: 2, pt: 2 }}>My Families</Typography>
            {isLoadingFamilies ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
            ) : isFamiliesError ? (
                <Alert severity="error" sx={{ m: 1 }}>Error loading families.</Alert>
            ) : ( 
                <List>
                    {familiesData?.families && familiesData.families.length > 0 ? (
                        familiesData.families.map((family) => (
                            <ListItem key={family._id} disablePadding>
                                <ListItemButton onClick={() => handleFamilyClick(family)}>
                                    <ListItemIcon><GroupIcon /></ListItemIcon>
                                    <ListItemText primary={family.name} />
                                </ListItemButton>
                            </ListItem>
                        ))
                    ) : (
                        <ListItem>
                            <ListItemText primary="No families found." sx={{ color: 'text.secondary' }} />
                        </ListItem>
                    )}
                     <ListItem disablePadding>
                        <ListItemButton component={RouterLink} to="/create-family">
                            <ListItemIcon><AddCircleOutlineIcon /></ListItemIcon>
                            <ListItemText primary="Create New Family" />
                        </ListItemButton>
                    </ListItem>
                </List>
            )}
            <Divider />
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <CssBaseline />
            <AppBar 
                position="fixed"
                sx={{ 
                    width: { md: `calc(100% - ${drawerWidth}px)` }, 
                    ml: { md: `${drawerWidth}px` },
                }}
            >
                <Toolbar>
                     <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                         FamiFirst
                    </Typography>
                    {token ? (
                        <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
                            Logout
                        </Button>
                    ) : (
                         <Button color="inherit" component={RouterLink} to="/login">Login</Button>
                    )}
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
                aria-label="mailbox folders"
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawerContent}
                </Drawer>
                 <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                    open
                >
                    {drawerContent}
                </Drawer>
            </Box>
            <Box 
                component="main" 
                sx={{ 
                    flexGrow: 1, 
                    p: 3, 
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    mt: '64px'
                }}
            >
                <Outlet />
            </Box>
            
            <NotificationSnackbar />
        </Box>
    );
};

export default Layout; 