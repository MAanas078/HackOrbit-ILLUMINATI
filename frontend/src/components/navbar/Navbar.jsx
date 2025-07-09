import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import {NavLink} from "react-router-dom"
import { useAuthStore } from '../../store/authStore';

const drawerWidth = 240;
const navItems = ['Insurance', 'AI Agent', 'FAQs'];

function Navbar(props) {
  const { window } = props;
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const {isAuthenticated} = useAuthStore();
  
  const handleDrawerToggle = () => {
    setMobileOpen((prevState) => !prevState);
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
      <NavLink to="/"><span style={{color:"#4a18b8"}}>Med</span>Genesis</NavLink>
      </Typography>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item} disablePadding>
            <ListItemButton sx={{ textAlign: 'center' }}>
              <ListItemText primary={item} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const container = window !== undefined ? () => window().document.body : undefined;

  const [active, setActive] = React.useState('Home');

  return (
    <Box sx={{ display: 'flex', position: "fixed", zIndex: 1200, width: "100%" }}>
      <CssBaseline />
      <AppBar component="nav" sx={{     backgroundColor: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(10px)", color: "white" }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              display: { xs: 'none', sm: 'block' },
              textTransform: "none",
              fontWeight: 900,
              fontFamily: "Oswald"
            }}
          >
           <NavLink to="/"><span style={{color:"#4a18b8"}}>Med</span>Genesis</NavLink> 
          </Typography>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            {navItems.map((item) => (
              <Button 
                key={item} 
                sx={{
                  color: "white", 
                  textTransform: "none", 
                  fontWeight: 600, 
                  borderBottom: active === item ? '2px solid black' : '',
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                    color:"black"
                  }
                }}
                onClick={() => setActive(item)}
              >
                {item}
              </Button>
            ))}

            {/* Authentication Buttons */}
            {isAuthenticated ? (
              <NavLink to="/profile"><Button  sx={{ marginLeft: "10px" }}>
              Profile
              </Button></NavLink>
            ) : (
              <NavLink to="/login">
              <Button
                sx={{
                  marginLeft: "10px",
                  color: "white",
                  backgroundColor: "#5F1EE6",
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: "8px",
                  padding: "5px 10px",
                  '&:hover': {
                    backgroundColor: "#4e1bb4",
                  }
                }}
              >
                Login
              </Button>
              </NavLink>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <nav>
        <Drawer
          container={container}
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
      </nav>
      <Box component="main" sx={{ p: 3 }}>
        <Toolbar />
      </Box>
    </Box>
  );
}

export default Navbar;
