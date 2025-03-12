import React,{useState,useEffect} from 'react'
import Image from 'next/image'
import { updateDoc,doc,getDoc,writeBatch} from "firebase/firestore"
import { DB } from '../firebaseConfig'
import ClipLoader from "react-spinners/ClipLoader"
import { useGlobalState } from '../globalState'
import { BsArrowLeftShort } from "react-icons/bs"
import { FcDeleteDatabase } from "react-icons/fc"
import { FcCalendar } from "react-icons/fc"
import { FcHighPriority } from "react-icons/fc"
import { FcMediumPriority } from "react-icons/fc"
import { Modal, Table } from "antd"
import dayjs from "dayjs"
import { GoogleMap,Marker } from "@react-google-maps/api"
import miniVan from '../images/minivan.png'
import maps from '../images/google-maps.png'
import money from '../images/dollar.png'

const Employees = () => {
  const { employees,drivers,companies } = useGlobalState()

  const [nameFilter,setNameFilter] = useState('')
  const [companyFilter,setCompanyFilter] = useState('')
  const [hasDriverFilter,setHasDriverFilter] = useState('')
  const [selectedEmployee,setSelectedEmployee] = useState(null)
  const [driverInfo, setDriverInfo] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [newEmployeeCarType,setNewEmployeeCarType] = useState('')
  const [loading,setLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingTimetable, setEditingTimetable] = useState([])
  const [isEditingTimeTable, setIsEditingTimeTable] = useState(false)
  const [isSavingNewTimeTable,setIsSavingNewTimeTable] = useState(false)
  const [selectedDays, setSelectedDays] = useState([])
  const [isModalMapVisible,setIsModalMapVisible] = useState(false)
  const [homeCoords, setHomeCoords] = useState(null)
  const [DestinationCoords, setDestinationCoords] = useState(null)
  const [selectedCompany,setSelectedCompany] = useState(null)
  const [isAddingDestinationLocation,setIsAddingDestinationLocation] = useState(false)
  const [distance, setDistance] = useState(null)
  const [monthlySubsModal,setMonthlySubsModal] = useState(false)
  const [totalSubAmount,setTotalSubAmount] = useState("0")
  const [companyCommission,setCompanyCommission] = useState("0")
  const [driverCommission,setDriverCommission] = useState("0")
  const [editMonthlyFeeLoading,setEditMonthlyFeeLoading] = useState(false)
  
  // Filtered employee based on search term
  const filteredEmployees = employees.filter((employee) =>{
    //check name
    const matchesName = nameFilter === '' || employee.full_name.includes(nameFilter)

    //check school
    const matchesCompany = companyFilter === '' || employee.destination.includes(companyFilter)

    //check he has a driver or not
    const matchesDriver = 
    hasDriverFilter === '' || 
    (hasDriverFilter === 'true' && employee.driver_id) || 
    (hasDriverFilter === 'false' && !employee.driver_id);

    // Return only employee matching all filters
    return matchesName && matchesCompany && matchesDriver;
  });

  // Handle employee name change
  const handleNameFilterChange = (event) => {
    setNameFilter(event.target.value);
  };

  // Handle employee school change
  const handleCompanyChange = (e) => {
    setCompanyFilter(e.target.value);
  };

  // Handle employee has driver change
  const handleHasDriverChange = (e) => {
    setHasDriverFilter(e.target.value);
  };

  // Select the employee
  const selectEmployee = async (employee) => {
    setSelectedEmployee(employee);
  };

  // Handle back action
  const goBack = () => {
    setSelectedEmployee(null);
    setIsEditing(false)
    setMonthlySubsModal(false)
  };

  //Calculate employee age
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

  //Find and set driver info when a employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      const assignedDriver = drivers.find(
        (driver) => String(driver.id) === String(selectedEmployee.driver_id)
      );
      setDriverInfo(assignedDriver || null)
      
    }
  }, [selectedEmployee, drivers]);

  //Fetch home and school location 
  useEffect(() => {
    if (selectedEmployee) {
      const homeLocation = selectedEmployee?.home_location?.coords;
      const workLocation = selectedEmployee?.destination_location;

      if (homeLocation && workLocation) {
        setHomeCoords({
          lat: homeLocation.latitude,
          lng: homeLocation.longitude,
        });
        setDestinationCoords({
          lat: workLocation.latitude,
          lng: workLocation.longitude,
        });

        // Calculate distance
        const calculatedDistance = getDistance(
          homeLocation.latitude,
          homeLocation.longitude,
          workLocation.latitude,
          workLocation.longitude
        );
        setDistance(calculatedDistance);
      }
    }
  }, [selectedEmployee]);

  // Haversine formula to calculate distance
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2); // Distance in kilometers
  };

  // Map Style
  const containerStyle = {
    width: '100%',
    height: '100%'
  }

  // Week days
  const daysOfWeek = [
    "الأحد",
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت"
  ];

  // Car Types
  const carTypes = [
    'سيارة صالون ٥ راكب',
    'سيارة خاصة ٧ راكب',
    'ستاركس',
    'باص صغير ١٢ راكب',
    'باص متوسط ١٤ راكب',
    'باص كبير ٣٠ راكب',
  ]

  //Open Map Modal
  const handleOpenMapModal = () => {
    setIsModalMapVisible(true)
  }

  //Close Map Modal
  const handleCloseMapModal = () => {
    setIsModalMapVisible(false)
  }

  //Open the time-table Modal
  const handleOpenModal = () => {
    setEditingTimetable(
      daysOfWeek.map((day) => {
        const dayData =
          selectedEmployee?.timetable?.find((t) => t.day === day) || {
            day,
            active: false,
            startTime: null,
            endTime: null,
          };
          return {
            ...dayData,
            active: dayData.active, // Ensure active is true if times are set
          };
      })
    );
    setIsModalVisible(true); // Show the modal
  };
  
  // Close the time-table Calendar
  const handleCloseModal = () => {
    setIsModalVisible(false)
    setIsEditingTimeTable(false)
  };

  // Handle input changes
  const handleInputChange = (value, day, field) => {
    setEditingTimetable((prev) =>
      prev.map((item) => {
        // Update only the specific day being modified
        if (item.day === day) {
          return {
            ...item,
            [field]: value
              ? new Date(`1970-01-01T${value}:00`) // Convert time to a Date object
              : null,
            active: !(value === "00:00" && field === "startTime") && !(value === "00:00" && field === "endTime"),
          };
        }
        return item;
      })
    );
  };
  
  // Save changes to Firestore
  const handleSaveTimetable = async () => {
    setIsSavingNewTimeTable(true)  
    try {
      const employeeRef = doc(DB, "riders", selectedEmployee.id)

      // Save the new timetable to Firestore
      await updateDoc(employeeRef, { timetable: editingTimetable })

      // Update local state to reflect the new timetable
      setSelectedEmployee((prev) => ({
        ...prev,
        timetable: editingTimetable,
      }));

      alert("تم تحديث الجدول الدراسي بنجاح!");
      setIsModalVisible(false);
      setSelectedDays([]);
    } catch (error) {
      console.error("Error updating timetable:", error);
      alert("حدث خطأ أثناء تحديث الجدول الدراسي. حاول مرة أخرى.");
    } finally {
      setIsSavingNewTimeTable(false)
    }
  };

  //Edit employee car type 
  const editRiderData = async() => {
    if (!newEmployeeCarType) {
      alert("الرجاء اختيار نوع السيارة");
      return;
    }
    setLoading(true)
    try {
      const employeeRef = doc(DB, "riders", selectedEmployee.id);
      await updateDoc(employeeRef, {
        car_type: newEmployeeCarType, // Update only the car type
      });

      alert("تم تعديل نوع السيارة بنجاح!");

      // Update the local state
      setSelectedEmployee((prev) => ({
        ...prev,
        car_type: newEmployeeCarType,
      }));

      // Clear the selection
      setNewEmployeeCarType("")
      setIsEditing(false)
    } catch (error) {
      console.log("Error updating car type:", error);
      alert("فشل في تعديل نوع السيارة. الرجاء المحاولة مرة أخرى.");
    } finally {
      setLoading(false)
    }
  }

  // Open monthly-subs modal
  const openMonthlySubsModal = (rider) => {
    setMonthlySubsModal(true)
    setTotalSubAmount(rider.monthly_sub > 0 ? rider.monthly_sub : '0')
    setCompanyCommission(rider.company_commission > 0 ? rider.company_commission : '0')
    setDriverCommission(rider.driver_commission > 0 ? rider.driver_commission : '0')
  }
  
  // Close monthly-subs modal
  const handleCloseMonthlySubsModal = () => {
    setMonthlySubsModal(false)
    setTotalSubAmount("0")
    setCompanyCommission("0")
    setDriverCommission("0")
  }

  // Format money input format
  const formatNumber = (value) => {
    if (!value) return '';
    return Number(value.toString().replace(/,/g, '')).toLocaleString('en-US');
  }

  // Handle total subscription change
  const handleTotalSubAmountChange = (value) => {
    const total = Number(value.replace(/,/g, '')) || 0;
    setTotalSubAmount(total)
    setDriverCommission(total - companyCommission)
  }

  // Handle company commission change
  const handleCompanyCommissionChange = (value) => {
    const commission = Number(value.replace(/,/g, '')) || 0;
    setCompanyCommission(commission)
    setDriverCommission(totalSubAmount - commission)
  }

  const ensureAllMonthsExist = (bill, monthlySub,companyCom) => {
    const updatedBill = { ...bill }; // Clone the existing bill object
    const currentYear = new Date().getFullYear();
  
    for (let month = 1; month <= 12; month++) {
      const key = `${currentYear}-${String(month).padStart(2, "0")}`;
  
      if (!updatedBill[key]) {
        updatedBill[key] = {
          driver_commission_amount: monthlySub,
          company_commission_amount: companyCom,
          start_date: null,
          end_date: null,
          paid: false,
        };
      }
    }
  
    return updatedBill;
  };

  // Function to get days in the current month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  //Edit employee monthly fee
  const editRiderMonthlyFee = async () => {
    if (totalSubAmount <= 0 || companyCommission < 0 || driverCommission < 0) {
      alert("الرجاء ادخال مبلغ مالي صحيح");
      return;
    }

    setEditMonthlyFeeLoading(true);

    try {
      const employeeRef = doc(DB, "riders", selectedEmployee.id)
      const employeeDoc = await getDoc(employeeRef);
      if (!employeeDoc.exists()) {
        alert("الحساب غير موجود");
        return;
      }

      const batch = writeBatch(DB)

      const employeeData = employeeDoc.data();
      const updatedBill = ensureAllMonthsExist(employeeData.bill || {}, driverCommission,companyCommission);

      // Get current Iraqi date
      const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Baghdad" }));
      const year = today.getFullYear();
      const month = today.getMonth();
      const currentMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

      // Loop through all months in the bill data and update accordingly
      Object.keys(updatedBill).forEach((monthKey) => {
        const bill = updatedBill[monthKey];

        if (bill.paid) {
          return; // Skip the current iteration if the bill is paid
        }

        if (bill.start_date) {
          const startDate = new Date(bill.start_date);
          const startDay = startDate.getDate();
          const totalDays = getDaysInMonth(startDate.getFullYear(), startDate.getMonth());
          const remainingDays = totalDays - startDay;

          // Calculate new prorated amount for months with start_date
          const newDailyRate = driverCommission / totalDays;
          const newProratedAmount = Math.round(newDailyRate * remainingDays);
          updatedBill[monthKey].driver_commission_amount = newProratedAmount;

        } else if (monthKey < currentMonthKey) {
          // For months before the current month, update to the full new amount
          updatedBill[monthKey].driver_commission_amount = driverCommission;
        } else {
          // For the current month and future months, apply new rates
          updatedBill[monthKey].driver_commission_amount = driverCommission;
        }
      });

      // Update the student document with all fee values
      batch.update(employeeRef, { 
        monthly_sub: Number(totalSubAmount.toString().replace(/,/g, "")),
        company_commission: Number(companyCommission.toString().replace(/,/g, "")),
        driver_commission: Number(driverCommission.toString().replace(/,/g, "")),
        bill: updatedBill,
      });

      // Commit the batch
      await batch.commit();

      alert("تم اضافة المبلغ المالي بنجاح");

      // Update the local state
      setSelectedEmployee((prev) => ({
        ...prev,
        monthly_sub: totalSubAmount,
        company_commission: companyCommission,
        driver_commission: driverCommission
      }));

      setTotalSubAmount(0);
      setCompanyCommission(0);
      setDriverCommission(0);
      setMonthlySubsModal(false)
    } catch (error) {
      console.error("Error updating the monthly subscription fee:", error);
      alert("حدث خطا. الرجاء المحاولة مرة ثانية");
    } finally {
      setEditMonthlyFeeLoading(false)
    }
  }

  //Add Employee destination location
  const handleUpdateEmployeeLocation = async () => {
    if (!selectedCompany) {
      alert("يرجى اختيار المؤسسة");
      return;
    }
  
    // Find the selected company in the companies list
    const company = companies.find((c) => c.name === selectedCompany);
  
    if (!company) {
      alert("المؤسسة غير موجودة");
      return;
    }

    setIsAddingDestinationLocation(true)
  
    try {
      const employeeRef = doc(DB, "riders", selectedEmployee.id);
      
      await updateDoc(employeeRef, {
        destination: company.name,
        destination_location: {
          latitude: company.latitude,
          longitude: company.longitude,
        },
      });
  
      // Update local state to reflect changes
      setSelectedEmployee((prev) => ({
        ...prev,
        destination: company.name,
        destination_location: {
          latitude: company.latitude,
          longitude: company.longitude,
        },
      }));
  
      alert("تم تحديث موقع العمل بنجاح");
    } catch (error) {
      console.error("Error updating employee location:", error);
      alert("حدث خطأ أثناء تحديث الموقع.")
      setIsAddingDestinationLocation(false)
    } finally{
      setIsAddingDestinationLocation(false)
      setSelectedCompany(null)
    }
  };
  
  //Delete rider document from DB
  const handleDelete = async (riderID) => {
    if (isDeleting) return;

    const confirmDelete = window.confirm("هل تريد بالتأكيد حذف هذا الحساب");
    if (!confirmDelete) return;

    setIsDeleting(true);

    try {
      const batch = writeBatch(DB);
      const riderRef = doc(DB, 'riders', riderID);
      const driverId = selectedEmployee.driver_id;
      const bills = selectedEmployee.bill || {};

      // Get today's date in Iraqi time
      const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Baghdad" }));
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const currentMonthKey = `${year}-${String(month).padStart(2, "0")}`;

      // Check if the student is still connected to a driver
      if (driverId) {
        alert("لا يمكن حذف هذا الراكب لأنه لا يزال مرتبطًا بسائق.");
        return;
      }

      // Check if the student has unpaid bills for the current or previous months
      const unpaidBills = Object.entries(bills).some(([key, bill]) => {
        return (!bill.paid) && (key === currentMonthKey || key < currentMonthKey);
      });

      if (unpaidBills) {
        alert("لا يمكن حذف هذا الراكب بسبب وجود فواتير غير مدفوعة.");
        return;
      }

      batch.delete(riderRef)
      await batch.commit()
      setSelectedEmployee(null)

      alert("تم الحذف بنجاح")

    } catch (error) {
      console.error("خطأ أثناء الحذف:", error.message)
      alert("حدث خطأ أثناء الحذف. حاول مرة أخرى.")
    } finally {
      setIsDeleting(false)
    }
  };

  return (
    <div className='white_card-section-container'>
      {selectedEmployee ? (
        <>
          <div className="item-detailed-data-container">

            <div className="item-detailed-data-header">
              <div className='item-detailed-data-header-title'>
                <h5>{selectedEmployee.phone_number || '-'}</h5>
                <h5 style={{marginLeft:'5px',marginRight:'5px'}}>-</h5>
                <h5 style={{marginRight:'4px'}}>{selectedEmployee.family_name}</h5>
                <h5>{selectedEmployee.parent_full_name || selectedEmployee.full_name}</h5>
              </div>
              <button className="info-details-back-button" onClick={goBack}>
                <BsArrowLeftShort size={24}/>
              </button>
            </div>

            <div className="item-detailed-data-main">

              <div className="student-detailed-data-main-firstBox">
                  <div>
                    <h5 style={{marginLeft:'4px'}}>{selectedEmployee.full_name}</h5>
                    <h5 style={{marginLeft:'4px'}}>-</h5>
                    <h5 style={{marginLeft:'4px'}}>{selectedEmployee.birth_date ? calculateAge(selectedEmployee.birth_date) : '-'}</h5>
                    <h5 style={{marginLeft:'10px'}}>سنة</h5>
                    <button className="student-edit-car-type-btn" onClick={handleOpenMapModal}>
                      <Image src={maps} width={16} height={16} alt='maps'/>
                    </button>
                    {/* Rider Map Modal */}
                    <Modal
                      title='موقع الطالب'
                      open={isModalMapVisible}
                      onCancel={handleCloseMapModal}
                      footer={[
                        <div className='map-distance-div' key='distance'>
                          <p>{distance} km</p>
                        </div>
                      ]}
                      centered
                    >
                      <div style={{ height: '500px', width: '100%',margin:'0px' }}>
                        {homeCoords && DestinationCoords ? (
                          <GoogleMap
                          mapContainerStyle={containerStyle}
                          center={homeCoords}
                          zoom={12}
                        >
                          <Marker 
                            position={homeCoords}
                            label={{
                              text:'المنزل',
                              color:'#000',
                              fontWeight:'bold'
                            }}
                          />
                          <Marker 
                            position={DestinationCoords}
                            label={{
                              text:'المؤسسة',
                              color:'#000',
                              fontWeight:'bold'
                            }}
                          />
                        </GoogleMap> 
                        ) : (
                          <h5>Loading</h5>
                        )}                   
                      </div>                     
                    </Modal>
                  </div>
                  
                  <div>
                    <h5 style={{marginLeft:'4px'}}>{selectedEmployee.home_address || '-'}</h5>
                    <h5 style={{marginLeft:'4px'}}>-</h5>
                   <h5>{selectedEmployee.street || '-'}</h5>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'4px'}}>{selectedEmployee.city || '-'}</h5>
                    <h5 style={{marginLeft:'4px'}}>-</h5>
                    <h5>{selectedEmployee.state || '-'}</h5>
                  </div>

                  <div>
                    <h5 style={{marginLeft:'5px'}}>{selectedEmployee.destination || '-'}</h5>
                    <button className="student-edit-car-type-btn" onClick={handleOpenModal}>
                      <FcCalendar size={24}/>
                    </button>
                    {/* Timetable Modal */}
                    <Modal
                      title="الجدول الدراسي"
                      open={isModalVisible}
                      onCancel={handleCloseModal}
                      footer={[
                        <button 
                          key="cancel" 
                          onClick={handleCloseModal}
                          disabled={isSavingNewTimeTable}
                          className='cancel-time-table-button'
                          style={{border:'1px solid #955BFE',color:'#955BFE',backgroundColor:'#fff'}}
                        >
                          إلغاء
                        </button>,
                        <button
                          key="save"
                          onClick={handleSaveTimetable}
                          disabled={isSavingNewTimeTable}
                          className='save-time-table-button'
                          style={{backgroundColor:'#955BFE',border:'none',color:'#fff',marginLeft:'10px'}}
                        >
                          {isSavingNewTimeTable ? (
                            <div style={{ width:'60px',padding:'3px 0px',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <ClipLoader
                                color={'#fff'}
                                loading={isSavingNewTimeTable}
                                size={10}
                                aria-label="Loading Spinner"
                                data-testid="loader"
                              />
                            </div>
                          ) : (
                            "حفظ"
                          )}
                        </button>,
                      ]}
                      centered
                    >
                      <Table
                        dataSource={editingTimetable}
                        columns={[
                          {
                            title: "تعديل",
                            key: "select",
                            render: (_, record) => (
                              <input
                                type="checkbox"
                                checked={selectedDays.includes(record.day)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedDays((prev) => [...prev, record.day]);
                                  } else {
                                    setSelectedDays((prev) =>
                                      prev.filter((day) => day !== record.day)
                                    );
                                  }
                                }}
                              />
                            ),
                          },
                          {
                            title: "وقت النهاية",
                            dataIndex: "endTime",
                            key: "endTime",
                            render: (time, record) =>
                              record.day === isEditingTimeTable || selectedDays.includes(record.day) ? (
                                <input
                                  type="time"
                                  value={
                                    time ? dayjs(time.seconds ? time.toDate() : time).format("HH:mm") : ""
                                  }
                                  onChange={(e) =>
                                    handleInputChange(e.target.value, record.day, "endTime")
                                  }
                                />
                              ) : record.active && time ? (
                                dayjs(time.seconds ? time.toDate() : time).format("HH:mm")
                              ) : (
                                "-"
                              ),
                          },
                          {
                            title: "وقت البداية",
                            dataIndex: "startTime",
                            key: "startTime",
                            render: (time, record) =>
                              record.day === isEditingTimeTable || selectedDays.includes(record.day) ? (
                                <input
                                  type="time"
                                  value={
                                    time ? dayjs(time.seconds ? time.toDate() : time).format("HH:mm") : ""
                                  }
                                  onChange={(e) =>
                                    handleInputChange(e.target.value, record.day, "startTime")
                                  }
                                />
                              ) : record.active && time ? (
                                dayjs(time.seconds ? time.toDate() : time).format("HH:mm")
                              ) : (
                                "-"
                              ),
                          },
                          {
                            title: "اليوم",
                            dataIndex: "day",
                            key: "day",
                          },
                        ]}
                        rowKey="day"
                        pagination={false}
                      />
                    </Modal>
                  </div>

                  <div>
                    <h5 style={{marginLeft:'4px'}}>{selectedEmployee.company_address || '-'}</h5>
                    <h5 style={{marginLeft:'4px'}}>-</h5>
                   <h5>{selectedEmployee.company_nearest_point || '-'}</h5>
                  </div>

                  <div>
                    <h5 style={{marginLeft:'10px'}}>{selectedEmployee.car_type || '-'}</h5>
                    {isEditing ? (
                      <div className='student-edit-car-type'>
                        <select
                          value={newEmployeeCarType}
                          onChange={(e) => setNewEmployeeCarType(e.target.value)}
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
                            <div style={{ width:'50px',height:'32px',margin:'0px 0px 0px 5px',backgroundColor:' #955BFE',padding:'0px',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <ClipLoader
                                color={'#fff'}
                                loading={loading}
                                size={10}
                                aria-label="Loading Spinner"
                                data-testid="loader"
                              />
                            </div>
                          ) : (
                            <button style={{width:'50px',marginLeft:'5px',padding:'7px'}} onClick={() => editRiderData()}>تعديل</button>
                          )}
                        </>
                        <button onClick={() => setIsEditing(false)} style={{width:'50px',padding:'7px',border:'1px solid #955BFE',color:'#955BFE',backgroundColor:'#fff'}} className='cancel-time-table-button'>الغاء</button>
                      </div>
                    ) : (
                      <button className="student-edit-car-type-btn" onClick={() => setIsEditing(true)}>
                        <Image src={miniVan} width={22} height={22} alt='minivan'/>
                      </button>
                    )}
                  </div>

                  <div>
                    <h5 style={{marginLeft:'5px'}}>
                      {selectedEmployee.monthly_sub ? Number(selectedEmployee.monthly_sub).toLocaleString('en-US') : '0'}
                    </h5>
                    <h5 style={{marginLeft:'10px'}}>دينار</h5>
                    <Image src={money} style={{marginLeft:'20px'}} width={18} height={18} alt='money'/>
                    <h5 className="student-open-edit-monthly-subs-modal" onClick={() => openMonthlySubsModal(selectedEmployee)}>
                      تعديل
                    </h5>
                    <Modal
                      title='الاشتراك الشهري'
                      open={monthlySubsModal}
                      onCancel={handleCloseMonthlySubsModal}
                      centered
                      footer={null}
                    >
                      <div style={{ height: '500px', width:'100%',display:'flex',justifyContent:'center',alignItems:'center',margin:'0px' }}>
                        <div className='student-edit-monthly-subs-container'>
                          <div>
                            <h5>المبلغ الجملي</h5>
                            <input 
                              value={formatNumber(totalSubAmount)}
                              onChange={(e) => handleTotalSubAmountChange(e.target.value)}
                              type='text'
                            />
                          </div>
                          <div>
                            <h5>حصة الشركة</h5>
                            <input 
                              value={formatNumber(companyCommission)}
                              onChange={(e) => handleCompanyCommissionChange(e.target.value)}
                              type='text'
                            />
                          </div>
                          <div>
                            <h5>حصة السائق</h5>
                            <input 
                              value={formatNumber(driverCommission)}
                              type='text'
                              readOnly
                            />
                          </div>
                          <div style={{textAlign:'center',marginTop:'20px'}}>
                            {editMonthlyFeeLoading ? (
                              <div style={{ width:'80px',height:'30px',backgroundColor:' #955BFE',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <ClipLoader
                                  color={'#fff'}
                                  loading={editMonthlyFeeLoading}
                                  size={10}
                                  aria-label="Loading Spinner"
                                  data-testid="loader"
                                />
                              </div>
                            ) : (
                              <button className='student-edit-monthly-subs-btn' onClick={() => editRiderMonthlyFee()}>تاكيد</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Modal>
                  </div>

                  <div>
                    <h5>{selectedEmployee.id}</h5>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'3px'}}>حذف الحساب</h5>
                    <button 
                      className="assinged-item-item-delete-button" 
                      onClick={() => handleDelete(selectedEmployee.id)}
                      disabled={isDeleting}
                    >
                      <FcDeleteDatabase size={24} />
                    </button>
                  </div>
                
              </div>

                <div className="student-detailed-data-main-second-box">
                  {selectedEmployee.destination_location?.latitude === 0 && selectedEmployee.destination_location?.longitude === 0 ? (
                    <div className='employee_add_destination_location_div'>
                      <h5>تحديد موقع عمل الموظف</h5>
                      <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}>
                        <option value=''>--</option>
                        {companies.map((company,index) => (
                          <option key={index} value={company.name}>{company.name}</option>
                        ))}                       
                      </select>
                      {isAddingDestinationLocation ? (
                        <div style={{ width:'120px',height:'30px',marginTop:'10px',borderRadius:'10px',backgroundColor:'#955BFE',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <ClipLoader
                            color={'#fff'}
                            loading={isAddingDestinationLocation}
                            size={10}
                            aria-label="Loading Spinner"
                            data-testid="loader"
                          />
                        </div>
                      ) : (
                        <button onClick={handleUpdateEmployeeLocation} style={{marginTop:'10px'}}>اضف</button>
                      )}
                      
                    </div>
                  ) : (
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
                  )}
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
               <input 
                onChange={handleCompanyChange} 
                value={companyFilter}
                placeholder='مقر العمل' 
                type='text' 
                className='students-section-inner-title_search_input' 
              />
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
            {filteredEmployees.map((employee, index) => (
              <div key={index} onClick={() => selectEmployee(employee)} className='single-item' >

                <div style={{display:'flex',flexDirection:'row-reverse',alignItems:'center',justifyContent:'center'}}>
                  <h5 style={{marginLeft:'5px'}}>{employee.full_name}</h5>
                  {employee.monthly_sub === 0 && (
                    <FcMediumPriority />
                  )}
                </div>
                

                <div style={{display:'flex',flexDirection:'row-reverse',alignItems:'center',justifyContent:'center'}}>
                  <h5 style={{marginLeft:'5px'}}>{employee.destination}</h5>

                  {employee.destination_location?.latitude === 0 && employee.destination_location?.longitude === 0 && (
                    <FcHighPriority />
                  )}

                </div>
                
                <div style={{flex:'3'}}>
                  <h5 className={employee.driver_id ? 'student-has-driver' : 'student-without-driver'}>{employee.driver_id ? 'نعم' : 'لا'}</h5>
                </div>
                
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Employees