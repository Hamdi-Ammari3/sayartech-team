import React,{useState} from 'react'
import { useGlobalState } from '../globalState'

const Schools = () => {

  const [searchTerm,setSearchTerm] = useState('')
  const { students, schools} = useGlobalState()

  // Group students by school
  const studentCounts = students.reduce((acc, student) => {
    acc[student.student_school] = (acc[student.student_school] || 0) + 1;
    return acc;
  }, {});

  // Add student count to each school
  const enrichedSchools = schools.map((school) => ({
    ...school,
    studentCount: studentCounts[school.name] || 0, // Use 0 if no students
  }));

  // Filtered students based on search term
  const filteredSchool = enrichedSchools.filter((school) => {
    return(
      school.name.includes(searchTerm)
    )
  })

  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  return (
    <div className='white_card-section-container'>
      <div className='students-section-inner'>
        <div className='students-section-inner-titles'>
          <div className='students-section-inner-title'>
            <input onChange={handleSearchChange} placeholder= 'المدرسة' type='text' className='students-section-inner-title_search_input'/>
          </div>
          <div className='students-section-inner-title'>
            <h5>نوع العقد</h5>
          </div>
          <div className='students-section-inner-title'>
            <h5>عدد الطلاب</h5>
          </div>
        </div>
        <div className='all-items-list'>
          {filteredSchool.map((school, index) => (
            <div key={index} className='single-item'>
              <h5 style={{paddingRight:'15px'}}>{school.name}</h5>
              <h5
                className={school.contract === 'تطبيق' ? 'app-only' : school.contract === 'تطبيق مع سواق' ? 'app-and-drivers' : ''}
              >{school.contract}</h5>
              <h5>{school.studentCount}</h5>
            </div>
          ))}
        </div>     
      </div>
    </div>
  )
}

export default Schools