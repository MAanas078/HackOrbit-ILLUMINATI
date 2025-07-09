import React from 'react'
import HeroSection from '../../pageComponent/home/HeroSection'
import SubscriptionCard from '../../pageComponent/home/SubscriptionCard'
import { FloatingDock } from '../../components/ui/floatingDock'
import {
    IconHome,
    IconUser,
    IconSettings,
    IconMessage,
    IconBell,
    IconSearch,
    IconBrain
  } from "@tabler/icons-react";
  import ContainerScroll from '../../components/ui/laptop'
  import img from "../../assets/images/img1.png"
import VelocityScroll from '../../components/ui/velocityScroll';
import OrbitingCircles from '../../components/ui/orbit';
import { IconCpu, IconDatabase, IconCloud, IconRobot, IconRocket } from "@tabler/icons-react";
import "../../App.css"
import TimelineDemo from "../../components/TimelineDemo"

  const dockItems = [
    {
      title: "Home",
      href: "/",
      icon: <IconHome className="w-full h-full text-white" />
    },
    {
      title: "Ideate",
      href: "/ideate",
      icon: <IconBrain className="w-full h-full text-white" />
    },
    {
      title: "List",
      href: "/automate",
      icon: <IconSettings className="w-full h-full text-white" />
    },
    {
      title: "Messages",
      href: "/messages",
      icon: <IconMessage className="w-full h-full text-white" />
    },
    {
      title: "Notifications",
      href: "/notifications",
      icon: <IconBell className="w-full h-full text-white" />
    },
    {
      title: "Search",
      href: "/search",
      icon: <IconSearch className="w-full h-full text-white" />
    }
  ];

function Home() {
  return (
    <div>
        <HeroSection/>
        <ContainerScroll
        titleComponent={
          <>
            <h1 className="text-4xl font-semibold text-black dark:text-white">
              Unleash your potential with <br />
              <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none">
                ResourceX
              </span>
            </h1>
          </>
        }
      >
        <img
          src={img}
          alt="hero"
          height={720}
          width={1400}
          className="mx-auto rounded-2xl object-contain h-full object-left-top"
          draggable={false}
        />
      </ContainerScroll>
      <VelocityScroll defaultVelocity={8} numRows={2}>
        Welcome to Dev.env
      </VelocityScroll>
        <SubscriptionCard/>
        <FloatingDock
        items={dockItems}
        desktopClassName="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
        mobileClassName="fixed bottom-4 right-4 z-50"
      />
<TimelineDemo/>
    </div>
  )
}

export default Home