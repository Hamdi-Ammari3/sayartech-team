import React,{useState} from 'react'
import { useGlobalState } from '../globalState'
import { FaCaretUp } from "react-icons/fa6"
import { FaCaretDown } from "react-icons/fa6"
import { Modal } from "antd"

const Schools = () => {
  const { students, schools} = useGlobalState()

  const [schoolNameFilter,setSchoolNameFilter] = useState('')
  const [contractFilter, setContractFilter] = useState('');
  const [studentCountSortDirection, setStudentCountSortDirection] = useState(null)
  const [selectedSchool,setSelectedSchool] = useState(null)
  const [isOpeningSchoolInfoModal,setIsOpeningSchoolInfoModal] = useState(false)

  // Group students by school
  const studentCounts = students.reduce((acc, student) => {
    acc[student.destination] = (acc[student.destination] || 0) + 1;
    return acc;
  }, {});

  // Add student count to each school
  const enrichedSchools = schools.map((school) => ({
    ...school,
    studentCount: studentCounts[school.name] || 0, // Use 0 if no students
  }));

  // Filter schools based on search term and contract type
  const filteredSchools = enrichedSchools.filter((school) => {
    const matchesName = school.name.includes(schoolNameFilter); // Filter by name
    const matchesContract = contractFilter ? school.contract === contractFilter : true; // Filter by contract
    return matchesName && matchesContract;
  });

   // Sort schools by student count
   const sortedSchools = filteredSchools.sort((a, b) => {
    if (!studentCountSortDirection) return 0; // No sorting
    if (studentCountSortDirection === 'asc') return a.studentCount - b.studentCount; // Ascending order
    if (studentCountSortDirection === 'desc') return b.studentCount - a.studentCount; // Descending order
  });

  // Handle school name input change
  const handleSearchChange = (event) => {
    setSchoolNameFilter(event.target.value);
  };

   // Handle contract filter change
   const handleContractFilterChange = (event) => {
    setContractFilter(event.target.value);
  };

  // Handle sorting by student count
  const handleSortByHighestStudentCount = () => {
    setStudentCountSortDirection('desc'); // Sort by highest
  };

  const handleSortByLowestStudentCount = () => {
    setStudentCountSortDirection('asc'); // Sort by lowest
  };

  const openSchoolInfoModal = (school) => {
    setSelectedSchool(school)
    setIsOpeningSchoolInfoModal(true)
  }

  const closeSchoolInfoModal = () => {
    setSelectedSchool(null)
    setIsOpeningSchoolInfoModal(false)
  }

  return (
    <div className='white_card-section-container'>
      <div className='students-section-inner'>
        <div className='students-section-inner-titles'>
          <div className='students-section-inner-title'>
            <input 
              onChange={handleSearchChange}
              value={schoolNameFilter}
              placeholder= 'المدرسة' 
              type='text' 
              className='students-section-inner-title_search_input'/>
          </div>
          <div className='students-section-inner-title'>
            <select 
              style={{width:'200px'}}
              onChange={handleContractFilterChange}
              value={contractFilter}
            >
              <option value=''>نوع العقد</option>
              <option value='تطبيق'>تطبيق</option>
              <option value='تطبيق مع سواق'>تطبيق مع سواق</option>
            </select>
          </div>
          <div className='students-section-inner-title'>
            <div className='driver-rating-box'>
              <button onClick={handleSortByLowestStudentCount}>
                <FaCaretDown 
                  size={18} 
                  className={studentCountSortDirection === 'asc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}/>
              </button>
              <h5>الطلاب</h5>
              <button onClick={handleSortByHighestStudentCount}>
                <FaCaretUp 
                  size={18}
                  className={studentCountSortDirection === 'desc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}/>
              </button>
            </div>
          </div>
        </div>
        <div className='all-items-list'>
          {sortedSchools.map((school, index) => (
            <div key={index} className='single-item'>
              <h5
                style={{paddingRight:'15px'}}
                onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
                onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
                onClick={() => openSchoolInfoModal(school)}
              >
                {school.name}
              </h5>
              <Modal
                title={selectedSchool?.name}
                open={isOpeningSchoolInfoModal}
                onCancel={closeSchoolInfoModal}
                centered
                footer={null}
              >
                <div className='school-info-modal'>
                  <p>{selectedSchool?.id}</p>
                </div>
              </Modal>
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