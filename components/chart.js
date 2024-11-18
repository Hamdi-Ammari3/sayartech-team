import React from 'react'
import { Bar } from 'react-chartjs-2';
import {Chart as ChartJS,CategoryScale,LinearScale,BarElement,Title,Tooltip,Legend,} from 'chart.js';
import { useGlobalState } from '../globalState'
import ClipLoader from "react-spinners/ClipLoader"

// Register required Chart.js components
ChartJS.register(CategoryScale,LinearScale,BarElement,Title,Tooltip,Legend);

import '../app/style.css'

const Chart = () => {
    const {users, loading, error } = useGlobalState()

    // Calculate users count per month
    const monthlyCounts = Array(12).fill(0); // Array to hold counts for 12 months

    users.forEach((user) => {
        const signupDate = user.user_signup_data?.toDate()
        const month = signupDate?.getMonth();
        monthlyCounts[month]++;
    });

    // Prepare the chart data
  const chartData = {
    labels: [
      'January', 'February', 'March', 'April', 'May', 
      'June', 'July', 'August', 'September', 'October', 
      'November', 'December'
    ],
    datasets: [
        {
          // Removed the label property to get rid of the dataset label
          data: monthlyCounts, // Pass the array of monthly counts
          backgroundColor: '#955BFE', // Bar color
          borderColor: '#955BFE', // Bar border color
          borderWidth: 1,
          borderRadius: 7,
          maxBarThickness: 15,
        },
      ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display:false
      },
      title: {
        display: false,
      },
      tooltip: {
        enabled: true,
      },
    },
    layout: {
        padding: {
          top: 20,
          bottom:20,
          left:20,
          right:20
        },
      },
    scales: {
        y: {
          display: false, // Hides the y-axis (numbers on the left)
        },
        x: {
          grid: {
            display: false,
          }
        }
      },
  };

  // Plugin to display numbers on top of bars
  const plugins = [
    {
      id: 'topLabels',
      afterDatasetsDraw(chart) {
        const { ctx, data, chartArea: { top }, scales: { x, y } } = chart;

        ctx.save();
        data.datasets[0].data.forEach((value, index) => {
          const xPosition = x.getPixelForValue(index);
          const yPosition = y.getPixelForValue(value);

          ctx.fillStyle = 'black'; // Text color
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(value, xPosition, yPosition - 5); // Position text above the bar
        });
      },
    },
  ];

  return (
    <div className='main_section_chart'>
        <div className='main_section_stat_header_div'>
            <h4>المستخدمين - 2024</h4>
        </div>
        {loading ? (
            <div style={{ width:'250px',padding:'12px 0',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ClipLoader
                  color={'#955BFE'}
                  loading={loading}
                  size={10}
                  aria-label="Loading Spinner"
                  data-testid="loader"
                />
            </div>
        ) : (
            <Bar data={chartData} options={options} plugins={plugins}/>
        )}
        
    </div>
  )
}

export default Chart