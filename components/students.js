import React,{useState,useEffect} from 'react'
import { updateDoc,doc,deleteDoc } from "firebase/firestore"
import { DB } from '../firebaseConfig'
import ClipLoader from "react-spinners/ClipLoader"
import { useGlobalState } from '../globalState'
import { BsArrowLeftShort } from "react-icons/bs"
import { MdDeleteOutline } from "react-icons/md"
import { CiEdit } from "react-icons/ci"

const Students = () => {
  const [nameFilter,setNameFilter] = useState('')
  const [schoolFilter,setSchoolFilter] = useState('')
  const [hasDriverFilter,setHasDriverFilter] = useState('')
  const [selectedStudent,setSelectedStudent] = useState(null)
  const [driverInfo, setDriverInfo] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [newStudentCarType,setNewStudentCarType] = useState('')
  const [loading,setLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false);

  const { students,drivers,schools } = useGlobalState()

  // Filtered students based on search term
  const filteredStudents = students.filter((student) =>{
    //check name
    const matchesName = nameFilter === '' || student.student_full_name.includes(nameFilter)

    //check school
    const matchesSchool = schoolFilter === '' || student.student_school === schoolFilter;

    //check he has a driver or not
    const matchesDriver = 
    hasDriverFilter === '' || 
    (hasDriverFilter === 'true' && student.driver_id) || 
    (hasDriverFilter === 'false' && !student.driver_id);

    // Return only students matching all filters
    return matchesName && matchesSchool && matchesDriver;
  });

  // Handle student name change
  const handleNameFilterChange = (event) => {
    setNameFilter(event.target.value);
  };

  // Handle student school change
  const handleSchoolChange = (e) => {
    setSchoolFilter(e.target.value);
  };

  // Handle student has driver change
  const handleHasDriverChange = (e) => {
    setHasDriverFilter(e.target.value);
  };

  // Select the student
  const selectStudent = async (student) => {
    setSelectedStudent(student);
  };

  // Handle back action
  const goBack = () => {
    setSelectedStudent(null);
    setIsEditing(false)
  };

  //Calculate student age
  const calculateAge = (birthdate) => {
    const birthDate = new Date(birthdate.seconds * 1000); // Convert Firestore Timestamp to JS Date
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
  
    // Adjust age if the current date is before the birthdate this year
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  
    return age;
  };

  // Find and set driver info when a student is selected
  useEffect(() => {
    if (selectedStudent) {
      const assignedDriver = drivers.find(
        (driver) => String(driver.driver_user_id) === String(selectedStudent.driver_id)
      );
      setDriverInfo(assignedDriver || null)
      
    }
  }, [selectedStudent, drivers]);

  const carTypes = [
    'سيارة صالون ٥ راكب',
    'سيارة خاصة ٧ راكب',
    'ستاركس',
    'باص صغير ١٢ راكب',
    'باص متوسط ١٤ راكب',
    'باص كبير ٣٠ راكب',
  ]

  //Edit Student Data 
  const editStudentData = async() => {
    if (!newStudentCarType) {
      alert("الرجاء اختيار نوع السيارة");
      return;
    }
    setLoading(true)
    try {
      const studentRef = doc(DB, "students", selectedStudent.id);
      await updateDoc(studentRef, {
        student_car_type: newStudentCarType, // Update only the car type
      });

      alert("تم تعديل نوع السيارة بنجاح!");

      // Optionally update the local state if needed
    setSelectedStudent((prev) => ({
      ...prev,
      student_car_type: newStudentCarType,
    }));

      // Clear the selection
      setNewStudentCarType("");
    } catch (error) {
      console.error("Error updating student car type:", error);
      alert("فشل في تعديل نوع السيارة. الرجاء المحاولة مرة أخرى.");
    } finally {
      setLoading(false)
    }
  }

  //Delete student document from DB
  const handleDelete = async (id) => {
    if (isDeleting) return;

    const confirmDelete = window.confirm("هل تريد بالتأكيد حذف هذا الطالب");
    if (!confirmDelete) return;

    setIsDeleting(true);

    try {
      const docRef = doc(DB, 'students', id);
      await deleteDoc(docRef);
      alert("تم الحذف بنجاح");
    } catch (error) {
      console.error("خطأ أثناء الحذف:", error);
      alert("حدث خطأ أثناء الحذف. حاول مرة أخرى.");
    } finally {
      setIsDeleting(false);
      setSelectedStudent(null)
    }
  };


  return (
    <div className='white_card-section-container'>
      {selectedStudent ? (
        <>
          <div className="item-detailed-data-container">

            <div className="item-detailed-data-header">
              <div className='item-detailed-data-header-title'>
                <h5 style={{marginRight:'3px'}}>{selectedStudent.student_family_name}</h5>
                <h5>{selectedStudent.student_full_name}</h5>
              </div>
              <button className="info-details-back-button" onClick={goBack}>
                <BsArrowLeftShort size={24}/>
              </button>
            </div>

            <div className="item-detailed-data-main">

              <div className="student-detailed-data-main-firstBox">
                  <div>
                    <h5 style={{marginLeft:'20px'}}>{selectedStudent.student_parent_full_name || selectedStudent.student_full_name}</h5>
                    <h5>{selectedStudent.student_phone_number || '-'}</h5>
                  </div>
                  <div>
                    <h5>{selectedStudent.student_school || '-'}</h5>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'10px'}}>{selectedStudent.student_birth_date ? calculateAge(selectedStudent.student_birth_date) : '-'}</h5>
                    <h5>سنة</h5>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'4px'}}>{selectedStudent.student_home_address || '-'}</h5>
                    <h5 style={{marginLeft:'4px'}}>-</h5>
                   <h5>{selectedStudent.student_street || '-'}</h5>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'4px'}}>{selectedStudent.student_city || '-'}</h5>
                    <h5 style={{marginLeft:'4px'}}>-</h5>
                    <h5>{selectedStudent.student_state || '-'}</h5>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'10px'}}>{selectedStudent.student_car_type || '-'}</h5>
                    {isEditing ? (
                      <div className='student-edit-car-type'>
                        <select
                          value={newStudentCarType}
                          onChange={(e) => setNewStudentCarType(e.target.value)}
                        >
                          <option value=''>--</option>
                          {carTypes.map(car => (
                            <option key={car} value={car}>
                              {car}
                            </option>
                          ))}
                        </select>
                        <>
                          {loading ? (
                            <div style={{ display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <ClipLoader
                                color={'#955BFE'}
                                loading={loading}
                                size={10}
                                aria-label="Loading Spinner"
                                data-testid="loader"
                              />
                            </div>
                          ) : (
                            <button onClick={() => editStudentData()}>تعديل</button>
                          )}
                        </>
                      </div>
                    ) : (
                      <button className="student-edit-car-type-btn" onClick={() => setIsEditing(true)}>
                        <CiEdit  size={24} className="email-back-button-icon"  />
                      </button>
                    )}
                    
                  </div>
                  <div>
                    <h5>{selectedStudent.id}</h5>
                  </div>
                  <div>
                  <button 
                      className="assinged-item-item-delete-button" 
                      onClick={() => handleDelete(selectedStudent.id)}
                      disabled={isDeleting}
                    >
                      <MdDeleteOutline size={24} />
                    </button>
                  </div>
                
              </div>

              <div className="student-detailed-data-main-second-box">
                <div className="item-detailed-data-main-second-box-content">
                  {driverInfo ? (
                    <div>
                      <div className="eligible-item-item">
                        <h5 style={{marginLeft:'4px'}}>{driverInfo.driver_full_name || '-'}</h5>
                        <h5 style={{marginLeft:'10px'}}>{driverInfo.driver_family_name || '-'}</h5>
                        <h5 style={{marginLeft:'10px'}}>-</h5>
                        <h5>{driverInfo.driver_phone_number || '-'}</h5>
                      </div>
                      <div className="eligible-item-item">
                        <h5>{driverInfo.driver_car_type || '-'}</h5>
                      </div>
                      <div className="eligible-item-item">
                        <h5 style={{marginLeft:'10px'}}>موديل</h5>
                        <h5>{driverInfo.driver_car_model || '-'}</h5>
                      </div>
                      <div className="eligible-item-item">
                        <h5 style={{marginLeft:'10px'}}>رقم لوحة</h5>
                        <h5>{driverInfo.driver_car_plate || '-'}</h5>
                      </div>                      
                    </div>
                  ) : (
                    <div>
                      <h5>لا يوجد سائق</h5>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </>
      ) : (
        <div className='students-section-inner'>
          <div className='students-section-inner-titles'>
            <div className='students-section-inner-title'>
              <input 
                onChange={handleNameFilterChange} 
                value={nameFilter}
                placeholder='الاسم' 
                type='text' 
                className='students-section-inner-title_search_input' 
              />
            </div>
            <div className='students-section-inner-title'>
              <select onChange={handleSchoolChange} value={schoolFilter}>
                <option value=''>المدرسة</option>
                {schools.map(school => (
                  <option key={school.id} value={school.name}>{school.name}</option>
                ))}
              </select>
            </div>
            <div className='students-section-inner-title'>
              <select onChange={handleHasDriverChange} value={hasDriverFilter}>
              <option value=''>لديه سائق</option>
                <option value={true}>نعم</option>
                <option value={false}>لا</option>
              </select>
            </div>
          </div>
          <div className='all-items-list'>
            {filteredStudents.map((student, index) => (
              <div key={index} onClick={() => selectStudent(student)} className='single-item' >
                <h5>{student.student_full_name}</h5>
                <h5>{student.student_school}</h5>
                <h5 className={student.driver_id ? 'student-has-driver' : 'student-without-driver'}>{student.driver_id ? 'نعم' : 'لا'}</h5>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Students