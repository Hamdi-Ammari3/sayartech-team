import React from 'react'
import Chart from './chart';
import Stats from './stats';
import '../app/style.css'

const Main = () => {
  return (
    <div className='main-section-container'>
      <Chart/>
      <Stats/>
    </div>
  )
}

export default Main
