import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/home/Home';
import {useAuthStore} from './store/authStore';
import { Toaster } from 'react-hot-toast';
import SignUpPage from './pages/auth/signup';
import LoginPage from './pages/auth/login';
import EmailVerificationPage from './pages/auth/EmailVerificationPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import LoadingSpinner from './components/auth/LoadingSpinner';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import { Link } from 'react-router-dom';
import "./App.css"
import Navbar, { 
	NavBody, 
	NavItems, 
	NavbarLogo, 
	NavbarButton,
	MobileNav,
	MobileNavHeader,
	MobileNavMenu,
	MobileNavToggle
  } from './components/ui/navbar'
import DeviceListingPage from './pages/device/Listing';
import DeviceDashboard from './pages/device/Dashboard';
import DeviceMarketplace from './pages/device/Marketplace';
import IdeateOptions from './pages/Ideate/IdeateOptions';
import IdeateAI from './pages/Ideate/IdeateAI';
import GithubRepoVisualizer from './pages/Ideate/GitGraphium';
import LenderDashboard from './components/IDE/LenderDashboard';
import RenterDashboard from './components/IDE/RenterDashboard';
import AutomatedListing from './components/AutomatedListing';
import Terminal from './components/terminal/terminal';
import BlenderLenderDashboard from './pages/blender/LenderDashboard';
import BlenderRenterDashboard from './pages/blender/RenterDashboard';
import BlenderMarketplace from './pages/blender/BlenderMarketplace';
import MapMarketplace from './pages/device/MapMarketplace';

// protect routes that require authentication
const ProtectedRoute = ({children}) => {
  const {isAuthenticated, user} = useAuthStore();
  if(!isAuthenticated){
    return <Navigate to="/login" replace />
  }

  if(!user.isVerified){
    return <Navigate to="/verify-email" replace />
  }

}

// redirect authenticated users to the home page
const RedirectAuthenticatedUser = ({ children }) => {
	const { isAuthenticated, user } = useAuthStore();

	if (isAuthenticated && user.isVerified) {
		return <Navigate to='/' replace />;
	}

	return children;
};

function App() {



	//Navbar
	const navItems = [
		{ name: "Home", link: "/" },
		{ name: "List Devices", link: "/list-device" },
		{ name: "Dashboard", link: "/dashboard" },
		{ name: "Marketplace", link: "/marketplace" },
		{ name: "Rent Computing", link: "/dashboard/renter" },
		{ name: "Lend Computing", link: "/dashboard/lender" },
		{ name: "Blender Marketplace", link: "/blender-marketplace" },
		{ name: "Blender Rendering", link: "/blender-renter" },
		{ name: "Lend for Blender", link: "/blender-lender" }
	  ];
	
	  // Add state for mobile menu
	  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
	  
	  const toggleMobileMenu = () => {
		setMobileMenuOpen(!mobileMenuOpen);
	  };

  const {isCheckingAuth, checkAuth, isAuthenticated} = useAuthStore();

  React.useEffect(()=>{
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) return <LoadingSpinner />;

  return (
    <div>
           <Navbar>
        {/* Desktop Navigation */}
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} className="flex-1" />
          <div className="relative z-20 flex items-center justify-end gap-2">
		  {!isAuthenticated?<NavbarButton href="/login" variant="secondary" className="w-full">Login</NavbarButton>:<NavbarButton href="/dashboard"  className="w-full">Profile</NavbarButton>}
		  {!isAuthenticated && <NavbarButton href="/signup" className="w-full">Sign Up</NavbarButton>}
          </div>
        </NavBody>
        
        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle 
              isOpen={mobileMenuOpen} 
              onClick={toggleMobileMenu} 
            />
          </MobileNavHeader>
          
          <MobileNavMenu 
            isOpen={mobileMenuOpen} 
            onClose={() => setMobileMenuOpen(false)}
          >
            {/* Mobile menu items */}
            {navItems.map((item, idx) => (
              <Link 
                key={`mobile-link-${idx}`} 
                to={item.link}
                className="w-full px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Mobile buttons */}
            <div className="mt-4 flex w-full flex-col gap-2 px-4">
              {!isAuthenticated?<NavbarButton href="/login" variant="secondary" className="w-full">Login</NavbarButton>:<NavbarButton href="/dashboard" variant="secondary" className="w-full">Profile</NavbarButton>}
              {!isAuthenticated && <NavbarButton href="/signup" className="w-full">Sign Up</NavbarButton>}
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>

      <Routes>
        <Route path="/" element={
            <Home/>
        } />
        <Route
					path='/signup'
					element={
						<RedirectAuthenticatedUser>
							<SignUpPage />
						</RedirectAuthenticatedUser>
					}
				/>
				<Route
					path='/login'
					element={
						<RedirectAuthenticatedUser>
							<LoginPage />
						</RedirectAuthenticatedUser>
					}
				/>
        <Route path='/verify-email' element={<EmailVerificationPage />} />
				<Route
					path='/forgot-password'
					element={
						<RedirectAuthenticatedUser>
							<ForgotPasswordPage />
						</RedirectAuthenticatedUser>
					}
				/>

				<Route
					path='/reset-password/:token'
					element={
						<RedirectAuthenticatedUser>
							<ResetPasswordPage />
						</RedirectAuthenticatedUser>
					}
				/>
        
				<Route
					path='/list-device'
					element={
							<DeviceListingPage/>
					}
				/>

        <Route
					path='/dashboard'
					element={
							<DeviceDashboard/>
					}
				/>

          <Route
					path='/marketplace'
					element={
							<DeviceMarketplace/>
					}
				/>
                <Route
					path='/ideate'
					element={
							<IdeateOptions/>
					}
				/>
				<Route
					path='/ideate/ai'
					element={
						<IdeateAI/>
					}
				/>

				<Route
					path='/analyze/ai'
					element={
						<GithubRepoVisualizer/>
					}
				/>

<Route 
            path="/dashboard/renter" 
            element={
              <RenterDashboard/>
            } 
          />
          <Route 
            path="/dashboard/lender" 
            element={
                <LenderDashboard/>
            } 
          />
		   <Route 
            path="/automate" 
            element={
                <AutomatedListing/>
            } 
          />
		  	   <Route 
            path="/terminalai" 
            element={
                <Terminal/>
            } 
          />
		  <Route 
            path="/blender-renter/:sessionId" 
            element={
                <BlenderRenterDashboard/>
            } 
          />
		  <Route 
            path="/blender-lender" 
            element={
                <BlenderLenderDashboard/>
            } 
          />
		  <Route 
            path="/blender-marketplace" 
            element={
                <BlenderMarketplace/>
            } 
          />
           <Route 
            path="/map" 
            element={
                <MapMarketplace/>
            } 
          />
				{/* catch all routes */}
				<Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
      <Toaster/>
    </div>
  )
}

export default App;