import { cn } from "../../lib/utils";
import { IconMenu2, IconX, IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { Link } from "react-router-dom";
import React, { useRef, useState } from "react";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const Navbar = ({ children, className }) => {
  const ref = useRef(null);
  const { scrollY } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setVisible(latest > 100);
  });

  return (
    <motion.div
      ref={ref}
      className={cn("fixed top-1 z-40 w-full", className)}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, { visible })
          : child
      )}
    </motion.div>
  );
};

export const NavBody = ({ children, className, visible }) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(10px)" : "none",
        boxShadow: visible
          ? "0 0 24px rgba(34, 42, 53, 0.06), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.04), 0 0 4px rgba(34, 42, 53, 0.08), 0 16px 68px rgba(47, 48, 55, 0.05), 0 1px 0 rgba(255, 255, 255, 0.1) inset"
          : "none",
        width: visible ? "40%" : "100%",
        y: visible ? 20 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 50,
      }}
      style={{
        minWidth: "800px",
      }}
      className={cn(
        "relative z-[60] mx-auto hidden w-full max-w-7xl flex-row items-center justify-between self-start rounded-full bg-transparent px-4 py-2 lg:flex dark:bg-transparent",
        visible && "bg-white/80 dark:bg-neutral-950/80",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export const NavItems = ({ items, className, onItemClick }) => {
  const [hovered, setHovered] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState({
    list: false,
    marketplace: false,
    resx: false
  });

  const toggleDropdown = (key) => {
    setDropdownOpen(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <motion.div
      onMouseLeave={() => {
        setHovered(null);
        setDropdownOpen({ list: false, marketplace: false, resx: false });
      }}
      className={cn(
        "absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-1 text-xs font-medium text-zinc-600 transition duration-200 hover:text-zinc-800 lg:flex lg:space-x-1",
        className
      )}
    >
      <div className="flex items-center">
        <WalletMultiButton className="scale-60 transform origin-left text-xs" />
      </div>

      {/* Home Link */}
      <Link
        onMouseEnter={() => setHovered("home")}
        onClick={onItemClick}
        className="relative px-3 py-1 text-neutral-600 dark:text-neutral-300"
        to="/"
      >
        {hovered === "home" && (
          <motion.div
            layoutId="hovered"
            className="absolute inset-0 h-full w-full rounded-full bg-gray-100 dark:bg-neutral-800"
          />
        )}
        <span className="relative z-20 text-xs">Home</span>
      </Link>

      {/* List Devices Dropdown */}
      <div className="relative">
        <button
          onMouseEnter={() => {
            setHovered("list");
            setDropdownOpen(prev => ({ ...prev, list: true }));
          }}
          onClick={() => toggleDropdown("list")}
          className="relative flex items-center px-3 py-1 text-neutral-600 dark:text-neutral-300"
        >
          {hovered === "list" && (
            <motion.div
              layoutId="hovered"
              className="absolute inset-0 h-full w-full rounded-full bg-gray-100 dark:bg-neutral-800"
            />
          )}
          <span className="relative z-20 text-xs">List Devices</span>
          <IconChevronDown size={12} className="relative z-20 ml-1" />
        </button>

        {dropdownOpen.list && (
          <div className="absolute top-full left-0 mt-1 w-32 rounded-md bg-white shadow-lg dark:bg-neutral-900">
            <Link
              to="/list-device"
              className="block px-3 py-2 text-xs text-neutral-700 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              onClick={() => setDropdownOpen(prev => ({ ...prev, list: false }))}
            >
              List Manual
            </Link>
            <Link
              to="/automate"
              className="block px-3 py-2 text-xs text-neutral-700 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              onClick={() => setDropdownOpen(prev => ({ ...prev, list: false }))}
            >
              List Automate
            </Link>
          </div>
        )}
      </div>

      {/* Dashboard Link */}
      <Link
        onMouseEnter={() => setHovered("dashboard")}
        onClick={onItemClick}
        className="relative px-3 py-1 text-neutral-600 dark:text-neutral-300"
        to="/dashboard"
      >
        {hovered === "dashboard" && (
          <motion.div
            layoutId="hovered"
            className="absolute inset-0 h-full w-full rounded-full bg-gray-100 dark:bg-neutral-800"
          />
        )}
        <span className="relative z-20 text-xs">Dashboard</span>
      </Link>

      {/* Marketplace Dropdown */}
      <div className="relative">
        <button
          onMouseEnter={() => {
            setHovered("marketplace");
            setDropdownOpen(prev => ({ ...prev, marketplace: true }));
          }}
          onClick={() => toggleDropdown("marketplace")}
          className="relative flex items-center px-3 py-1 text-neutral-600 dark:text-neutral-300"
        >
          {hovered === "marketplace" && (
            <motion.div
              layoutId="hovered"
              className="absolute inset-0 h-full w-full rounded-full bg-gray-100 dark:bg-neutral-800"
            />
          )}
          <span className="relative z-20 text-xs">Marketplace</span>
          <IconChevronDown size={12} className="relative z-20 ml-1" />
        </button>

        {dropdownOpen.marketplace && (
          <div className="absolute top-full left-0 mt-1 w-32 rounded-md bg-white shadow-lg dark:bg-neutral-900">
            <Link
              to="/marketplace"
              className="block px-3 py-2 text-xs text-neutral-700 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              onClick={() => setDropdownOpen(prev => ({ ...prev, marketplace: false }))}
            >
              Device Store
            </Link>
            <Link
              to="/blender-marketplace"
              className="block px-3 py-2 text-xs text-neutral-700 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              onClick={() => setDropdownOpen(prev => ({ ...prev, marketplace: false }))}
            >
              3D Store
            </Link>
          </div>
        )}
      </div>

      {/* ResX Dropdown */}
      <div className="relative">
        <button
          onMouseEnter={() => {
            setHovered("resx");
            setDropdownOpen(prev => ({ ...prev, resx: true }));
          }}
          onClick={() => toggleDropdown("resx")}
          className="relative flex items-center px-3 py-1 text-neutral-600 dark:text-neutral-300"
        >
          {hovered === "resx" && (
            <motion.div
              layoutId="hovered"
              className="absolute inset-0 h-full w-full rounded-full bg-gray-100 dark:bg-neutral-800"
            />
          )}
          <span className="relative z-20 text-xs">ResX</span>
          <IconChevronDown size={12} className="relative z-20 ml-1" />
        </button>

        {dropdownOpen.resx && (
          <div className="absolute top-full left-0 mt-1 w-32 rounded-md bg-white shadow-lg dark:bg-neutral-900">
            
            {/* Code Option with Sub-dropdown */}
            <div className="relative group">
              <div className="flex items-center justify-between px-3 py-2 text-xs text-neutral-700 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer">
                <span>Code</span>
                <IconChevronRight size={12} />
              </div>
              
              {/* Code Sub-dropdown */}
              <div className="absolute left-full top-0 ml-1 w-32 rounded-md bg-white shadow-lg dark:bg-neutral-900 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <Link
                  to="/dashboard/lender"
                  className="block px-3 py-2 text-xs text-neutral-700 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  onClick={() => setDropdownOpen(prev => ({ ...prev, resx: false }))}
                >
                  Lender?
                </Link>
                <Link
                  to="/dashboard/renter"
                  className="block px-3 py-2 text-xs text-neutral-700 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  onClick={() => setDropdownOpen(prev => ({ ...prev, resx: false }))}
                >
                  Renter
                </Link>
              </div>
            </div>
            
            {/* Blender Option with Sub-dropdown */}
            <div className="relative group">
              <div className="flex items-center justify-between px-3 py-2 text-xs text-neutral-700 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer">
                <span>Blender</span>
                <IconChevronRight size={12} />
              </div>
              
              {/* Blender Sub-dropdown */}
              <div className="absolute left-full top-0 ml-1 w-32 rounded-md bg-white shadow-lg dark:bg-neutral-900 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <Link
                  to="/blender-lender"
                  className="block px-3 py-2 text-xs text-neutral-700 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  onClick={() => setDropdownOpen(prev => ({ ...prev, resx: false }))}
                >
                  Lender?
                </Link>
                <Link
                  to="/dashboard/blender/renter"
                  className="block px-3 py-2 text-xs text-neutral-700 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  onClick={() => setDropdownOpen(prev => ({ ...prev, resx: false }))}
                >
                  Renter
                </Link>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(10px)" : "none",
        boxShadow: visible
          ? "0 0 24px rgba(34, 42, 53, 0.06), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.04), 0 0 4px rgba(34, 42, 53, 0.08), 0 16px 68px rgba(47, 48, 55, 0.05), 0 1px 0 rgba(255, 255, 255, 0.1) inset"
          : "none",
        width: visible ? "90%" : "100%",
        paddingRight: visible ? "12px" : "0px",
        paddingLeft: visible ? "12px" : "0px",
        borderRadius: visible ? "4px" : "2rem",
        y: visible ? 20 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 50,
      }}
      className={cn(
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-between bg-transparent px-0 py-2 lg:hidden",
        visible && "bg-white/80 dark:bg-neutral-950/80",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({ children, className }) => {
  return (
    <div
      className={cn("flex w-full flex-row items-center justify-between", className)}
    >
      {children}
    </div>
  );
};

export const MobileNavMenu = ({ children, className, isOpen, onClose }) => {
  // State for mobile dropdowns
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState({
    list: false,
    marketplace: false,
    resx: false,
    code: false,
    blender: false,
  });

  const toggleMobileDropdown = (key) => {
    setMobileDropdownOpen(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "absolute inset-x-0 top-16 z-50 flex w-full flex-col items-start justify-start gap-2 rounded-lg bg-white px-4 py-4 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] dark:bg-neutral-950",
            className
          )}
        >
          {/* Home Link */}
          <Link 
            to="/"
            className="w-full px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            onClick={onClose}
          >
            Home
          </Link>
          
          {/* List Devices Dropdown */}
          <div className="w-full">
            <button
              onClick={() => toggleMobileDropdown("list")}
              className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <span>List Devices</span>
              <IconChevronDown size={12} className={`transition-transform ${mobileDropdownOpen.list ? 'rotate-180' : ''}`} />
            </button>
            
            {mobileDropdownOpen.list && (
              <div className="ml-4 border-l border-neutral-200 pl-2 dark:border-neutral-700">
                <Link
                  to="/list-device"
                  className="block w-full px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  onClick={onClose}
                >
                  List Manual
                </Link>
                <Link
                  to="/automate"
                  className="block w-full px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  onClick={onClose}
                >
                  List Automate
                </Link>
              </div>
            )}
          </div>
          
          {/* Dashboard Link */}
          <Link 
            to="/dashboard"
            className="w-full px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            onClick={onClose}
          >
            Dashboard
          </Link>
          
          {/* Marketplace Dropdown */}
          <div className="w-full">
            <button
              onClick={() => toggleMobileDropdown("marketplace")}
              className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <span>Marketplace</span>
              <IconChevronDown size={12} className={`transition-transform ${mobileDropdownOpen.marketplace ? 'rotate-180' : ''}`} />
            </button>
            
            {mobileDropdownOpen.marketplace && (
              <div className="ml-4 border-l border-neutral-200 pl-2 dark:border-neutral-700">
                <Link
                  to="/marketplace/device-store"
                  className="block w-full px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  onClick={onClose}
                >
                  Device Store
                </Link>
                <Link
                  to="/marketplace/3d-store"
                  className="block w-full px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  onClick={onClose}
                >
                  3D Store
                </Link>
              </div>
            )}
          </div>
          
          {/* ResX Dropdown */}
          <div className="w-full">
            <button
              onClick={() => toggleMobileDropdown("resx")}
              className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <span>ResX</span>
              <IconChevronDown size={12} className={`transition-transform ${mobileDropdownOpen.resx ? 'rotate-180' : ''}`} />
            </button>
            
            {mobileDropdownOpen.resx && (
              <div className="ml-4 border-l border-neutral-200 pl-2 dark:border-neutral-700">
                {/* Code Sub-dropdown */}
                <div className="w-full">
                  <button
                    onClick={() => toggleMobileDropdown("code")}
                    className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    <span>Code</span>
                    <IconChevronDown size={12} className={`transition-transform ${mobileDropdownOpen.code ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {mobileDropdownOpen.code && (
                    <div className="ml-4 border-l border-neutral-200 pl-2 dark:border-neutral-700">
                      <Link
                        to="/dashboard/code/lender"
                        className="block w-full px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                        onClick={onClose}
                      >
                        Lender?
                      </Link>
                      <Link
                        to="/dashboard/code/renter"
                        className="block w-full px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                        onClick={onClose}
                      >
                        Renter
                      </Link>
                    </div>
                  )}
                </div>
                
                {/* Blender Sub-dropdown */}
                <div className="w-full">
                  <button
                    onClick={() => toggleMobileDropdown("blender")}
                    className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    <span>Blender</span>
                    <IconChevronDown size={12} className={`transition-transform ${mobileDropdownOpen.blender ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {mobileDropdownOpen.blender && (
                    <div className="ml-4 border-l border-neutral-200 pl-2 dark:border-neutral-700">
                      <Link
                        to="/blender-lender"
                        className="block w-full px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                        onClick={onClose}
                      >
                        Lender?
                      </Link>
                      <Link
                        to="/dashboard/blender/renter"
                        className="block w-full px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                        onClick={onClose}
                      >
                        Renter
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Mobile buttons */}
          <div className="mt-4 flex w-full flex-col gap-2 px-2">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({ isOpen, onClick }) => {
  return isOpen ? (
    <IconX className="text-black dark:text-white" onClick={onClick} />
  ) : (
    <IconMenu2 className="text-black dark:text-white" onClick={onClick} />
  );
};

export const NavbarLogo = () => {
  return (
    <Link
      to="/"
      className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-xs font-normal text-black"
    >
      <span className="font-medium text-black dark:text-white">Dev.env</span>
    </Link>
  );
};

export const NavbarButton = ({
  href,
  as: Tag = "a",
  children,
  className,
  variant = "primary",
  ...props
}) => {
  const baseStyles =
    "px-3 py-1 rounded-md bg-white button text-black text-xs font-bold relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-block text-center";

  const variantStyles = {
    primary:
      "shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]",
    secondary: "bg-transparent shadow-none dark:text-white",
    dark: "bg-black text-white shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]",
    gradient:
      "bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset]",
  };

  return (
    <Tag
      href={href || undefined}
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Tag>
  );
};

export default Navbar;