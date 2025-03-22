import React,{useState} from 'react'
import { useGlobalState } from '../globalState'
import { DB } from '../firebaseConfig'
import { collection,addDoc} from "firebase/firestore"
import ClipLoader from "react-spinners/ClipLoader"
import { FaCaretUp } from "react-icons/fa6"
import { FaCaretDown } from "react-icons/fa6"
import { Modal } from "antd"

const Destination = () => {

  const { students,schools,employees,companies,drivers} = useGlobalState()

  const [selectedTab, setSelectedTab] = useState('schools')
  const [schoolNameFilter,setSchoolNameFilter] = useState('')
  const [companyNameFilter,setCompanyNameFilter] = useState('')
  const [studentCountSortDirection, setStudentCountSortDirection] = useState(null)
  const [employeeCountSortDirection, setEmployeeCountSortDirection] = useState(null)
  const [lineCountSortDirection, setLineCountSortDirection] = useState(null)
  const [selectedSchool,setSelectedSchool] = useState(null)
  const [selectedCompany,setSelectedCompany] = useState(null)
  const [isOpeningSchoolInfoModal,setIsOpeningSchoolInfoModal] = useState(false)
  const [isOpeningCompanyInfoModal,setIsOpeningCompanyInfoModal] = useState(false)
  const [isOpeningAddingDestinationModal,setIsOpeningAddingDestinationModal] = useState(false)
  const [newDestinationName,setNewDestinationName] = useState('')
  const [newDestinationLocation,setNewDestinationLocation] = useState('')
  const [isAddingNewSchoolLoading,setIsAddingNewSchoolLoading] = useState(false)

  // Count students for each school
  const studentCounts = students.reduce((acc, student) => {
    acc[student.destination] = (acc[student.destination] || 0) + 1;
    return acc;
  }, {});

   // Count employees for each company
   const employeeCounts = employees.reduce((acc, employee) => {
    acc[employee.destination] = (acc[employee.destination] || 0) + 1;
    return acc;
  }, {});

  // Count lines for each school
  const lineCounts = drivers.reduce((acc, driver) => {
    driver.line.forEach((line) => {
      const destination = line.line_destination;
      if (destination) {
        acc[destination] = (acc[destination] || 0) + 1;
      }
    });
    return acc;
  }, {});

  // Add student count to each school
  const enrichedSchools = schools.map((school) => ({
    ...school,
    studentCount: studentCounts[school.name] || 0,
    lineCount: lineCounts[school.name] || 0,
  }));

   // Add employees count to each company
   const enrichedCompanies = companies.map((company) => ({
    ...company,
    employeeCount: employeeCounts[company.name] || 0,
    lineCount: lineCounts[company.name] || 0,
  }));

  // Filter schools based on search term and contract type
  const filteredSchools = enrichedSchools.filter((school) => {
    const matchesName = school.name.includes(schoolNameFilter)
    return matchesName
  });

  // Filter companies based on name
  const filteredCompanies = enrichedCompanies.filter((company) => {
    const matchesName = company.name.includes(companyNameFilter)
    return matchesName
  });

  // Sort schools by student count
  const sortedSchools = filteredSchools.sort((a, b) => {
    if (studentCountSortDirection === 'asc') return a.studentCount - b.studentCount;
    if (studentCountSortDirection === 'desc') return b.studentCount - a.studentCount;
    if (lineCountSortDirection === 'asc') return a.lineCount - b.lineCount;
    if (lineCountSortDirection === 'desc') return b.lineCount - a.lineCount;
    return 0;
  });

  // Sort companies by employee count
  const sortedCompanies = filteredCompanies.sort((a, b) => {
    if (employeeCountSortDirection === 'asc') return a.employeeCount - b.employeeCount
    if (employeeCountSortDirection === 'desc') return b.employeeCount - a.employeeCount
    if (lineCountSortDirection === 'asc') return a.lineCount - b.lineCount
    if (lineCountSortDirection === 'desc') return b.lineCount - a.lineCount
    return 0;
  });

  // Handle name input change
  const handleSearchChange = (event) => {
    if(selectedTab === 'schools') {
      setSchoolNameFilter(event.target.value);
    } else if(selectedTab === 'companies') {
      setCompanyNameFilter(event.target.value);
    };
  };

  // Handle sorting by highest student count
  const handleSortByHighestStudentCount = () => {
    setStudentCountSortDirection('desc');
  };

  // Handle sorting by lowest student count
  const handleSortByLowestStudentCount = () => {
    setStudentCountSortDirection('asc');
  };

  // Handle sorting by highest employees count
  const handleSortByHighestEmployeesCount = () => {
    setEmployeeCountSortDirection('desc')
  };
  
  // Handle sorting by lowest employees count
  const handleSortByLowestEmployeesCount = () => {
    setEmployeeCountSortDirection('asc')
  };

  // Handle sorting by line count
  const handleSortByHighestLineCount = () => {
    setLineCountSortDirection('desc');
  };

  const handleSortByLowestLineCount = () => {
    setLineCountSortDirection('asc');
  };

  const openSchoolInfoModal = (school) => {
    setSelectedSchool(school)
    setIsOpeningSchoolInfoModal(true)
  }

  const closeSchoolInfoModal = () => {
    setSelectedSchool(null)
    setIsOpeningSchoolInfoModal(false)
  }

  // Open company info modal
  const openCompanyInfoModal = (company) => {
    setSelectedCompany(company)
    setIsOpeningCompanyInfoModal(true)
  }
  
  // Close company info modal
  const closeCompanyInfoModal = () => {
    setSelectedCompany(null)
    setIsOpeningCompanyInfoModal(false)
  }

  // Open adding new school modal
  const openAddNewDestinationModal = () => {
    setIsOpeningAddingDestinationModal(true)
  }
  
  // Open adding new school modal
  const closeAddNewDestinationModal = () => {
    setIsOpeningAddingDestinationModal(false)
  }

  // Adding new School data
  const addNewDestinationHandler = async() => {
    if (!newDestinationName || !newDestinationLocation) {
      alert("يرجى إدخال الاسم و الموقع");
      return;
    }

    // Extract latitude and longitude
    const coordsArray = newDestinationLocation.split(",");
    if (coordsArray.length !== 2) {
      alert("الرجاء إدخال إحداثيات صحيحة بصيغة (latitude, longitude)");
      return;
    }

    const latitude = parseFloat(coordsArray[0].trim());
    const longitude = parseFloat(coordsArray[1].trim());

    if (isNaN(latitude) || isNaN(longitude)) {
        alert("الرجاء إدخال إحداثيات صحيحة بصيغة (latitude, longitude)");
        return;
    }

    setIsAddingNewSchoolLoading(true)

    try {
      const newDestination = {
        name:newDestinationName,
        latitude:latitude,
        longitude:longitude
      }

      if (selectedTab === 'schools') {
        const schoolRef = await addDoc(collection(DB, "schools"), newDestination);
      } else if (selectedTab === 'companies') {
        const companyRef = await addDoc(collection(DB, "companies"), newDestination);
      }      

      closeAddNewDestinationModal()

      alert("تمت إضافة المؤسسة بنجاح");

    } catch (error) {
      console.error("Error adding new school:", error);
      alert("حدث خطأ أثناء إضافة المؤسسة. حاول مرة أخرى.");
    } finally{
      setIsAddingNewSchoolLoading(false)
      setNewDestinationName("");
      setNewDestinationLocation("");
    }
  }

  // Render add new school section
  const renderAddNewDestination = () => (
    <>
      <div className='add_new_destination_box'>
        <div className='add_new_destination_btn' onClick={openAddNewDestinationModal}>
          <p style={{fontSize:'15px',color:'#fff'}}>اضافة مؤسسة</p>
        </div>
      </div>

      <Modal
        title={selectedTab === 'schools' ? 'مدرسة جديدة' : 'شركة جديدة'}
        open={isOpeningAddingDestinationModal}
        onCancel={closeAddNewDestinationModal}
        centered
        footer={null}
      >
        <div className='add_new_company_info_modal'>
          <div className='add_new_company_info_modal_form'>
            <input 
              type='text' 
              placeholder='الاسم'
              value={newDestinationName}
              onChange={(e) => setNewDestinationName(e.target.value)}
            />
            <input 
              type='text' 
              placeholder='الموقع'
              value={newDestinationLocation}
              onChange={(e) => setNewDestinationLocation(e.target.value)}
            />
            {isAddingNewSchoolLoading ? (
              <div style={{ width:'120px',height:'30px',borderRadius:'10px',backgroundColor:'#955BFE',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ClipLoader
                  color={'#fff'}
                  loading={isAddingNewSchoolLoading}
                  size={10}
                  aria-label="Loading Spinner"
                  data-testid="loader"
                />
              </div>
            ) : (
              <button onClick={addNewDestinationHandler}>اضف</button>
            )}
          </div>
        </div>
      </Modal>
    </>
  )

  // Toggle between school or company
  const renderToggle = () => (
    <div className='toggle-between-school-company-container'>
      <div
        className={`toggle-between-school-company-btn ${selectedTab === 'companies' ? 'active' : ''}`} 
        onClick={() => setSelectedTab('companies')}
      >
        <h5>الشركات</h5>
      </div>
      <div
        className={`toggle-between-school-company-btn ${selectedTab === 'schools' ? 'active' : ''}`} 
        onClick={() => setSelectedTab('schools')}
      >
        <h5>المدارس</h5>
      </div>
    </div>
  )

  // Render school titles
  const renderSchoolTitles = () => (
    <div className='students-section-inner-titles'>
      <div className='students-section-inner-title'>
        <input 
          onChange={handleSearchChange}
          value={schoolNameFilter}
          placeholder= 'المدرسة' 
          type='text' 
          className='students-section-inner-title_search_input'
        />
      </div>
      <div className='students-section-inner-title'>
        <div className='driver-rating-box'>
          <button onClick={handleSortByLowestLineCount}>
            <FaCaretDown 
              size={18} 
              className={lineCountSortDirection  === 'asc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}/>
          </button>
          <h5>الخطوط</h5>
          <button onClick={handleSortByHighestLineCount}>
            <FaCaretUp 
              size={18}
              className={lineCountSortDirection  === 'desc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}/>
          </button>
        </div>
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
  )

  // Render company titles
  const renderCompanyTitles = () => (
    <div className='students-section-inner-titles'>
      <div className='students-section-inner-title'>
        <input 
          onChange={handleSearchChange}
          value={companyNameFilter}
          placeholder= 'المؤسسة' 
          type='text' 
          className='students-section-inner-title_search_input'
        />
      </div>
      <div className='students-section-inner-title'>
        <div className='driver-rating-box'>
          <button onClick={handleSortByLowestLineCount}>
            <FaCaretDown 
              size={18} 
              className={lineCountSortDirection  === 'asc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}
            />
          </button>
          <h5>الخطوط</h5>
          <button onClick={handleSortByHighestLineCount}>
            <FaCaretUp 
              size={18}
              className={lineCountSortDirection  === 'desc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}
            />
          </button>
        </div>
      </div>
      <div className='students-section-inner-title'>
        <div className='driver-rating-box'>
          <button onClick={handleSortByLowestEmployeesCount}>
            <FaCaretDown 
              size={18} 
              className={employeeCountSortDirection === 'asc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}
            />
          </button>
          <h5>الموظفين</h5>
          <button onClick={handleSortByHighestEmployeesCount}>
            <FaCaretUp 
              size={18}
              className={employeeCountSortDirection === 'desc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}
            />
          </button>
        </div>
      </div>
    </div>
  )

  // Render rows 
  const renderSchoolRows = () => (
    <div className='all-items-list'>
      {sortedSchools.map((school, index) => (
        <div key={index} className='single-item'>
          <div>
            <h5
              onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
              onClick={() => openSchoolInfoModal(school)}
            >
              {school.name}
            </h5>
          </div>
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
          <div>
            <h5>{school.lineCount}</h5>
          </div>
          <div>
            <h5>{school.studentCount}</h5>
          </div>         
        </div>
      ))}
    </div>   
  )

  // Render rows 
  const renderCompanyRows = () => (
    <div className='all-items-list'>
      {sortedCompanies.map((company, index) => (
        <div key={index} className='single-item'>
          <div>
            <h5
              onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
              onClick={() => openCompanyInfoModal(company)}
            >
              {company.name}
            </h5>
          </div>
          <Modal
            title={selectedCompany?.name}
            open={isOpeningCompanyInfoModal}
            onCancel={closeCompanyInfoModal}
            centered
            footer={null}
          >
            <div className='school-info-modal'>
              <p>{selectedCompany?.id}</p>
            </div>
          </Modal>
          <div>
            <h5>{company.lineCount}</h5>
          </div>
          <div>
            <h5>{company.employeeCount}</h5>
          </div> 
        </div>
      ))}
    </div>     
  )

  return (
    <div className='white_card-section-container'>
      <div className='students-section-inner'>

        {renderAddNewDestination()}

        {renderToggle()}

        {selectedTab === 'schools' ? renderSchoolTitles() : renderCompanyTitles()}

        {selectedTab === 'schools' ? renderSchoolRows() : renderCompanyRows()}
          
      </div>
    </div>
  )
}

export default Destination