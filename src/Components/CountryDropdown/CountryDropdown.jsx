import React, { useEffect, useState, useContext } from 'react';
import Button from '@mui/material/Button';
import { FaAngleDown } from 'react-icons/fa6';
import Dialog from '@mui/material/Dialog';
import { IoIosSearch } from "react-icons/io";
import { MdClose } from 'react-icons/md';
import Slide from '@mui/material/Slide';
import { MyContext } from '../../App';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CountryDropdown = () => {
  const [isOpenModal, setisOpenModal] = useState(false);
  const [countryList, setCountryList] = useState([]);
  const context = useContext(MyContext);

  const selectCountry = (index, country) => {
    setisOpenModal(false);
    context.setSelectedCountry(country);
  };

  useEffect(() => {
    setCountryList(context.countryList);
  }, [context.countryList]);

  const filterList = (e) => {
    const keyword = e.target.value.toLowerCase();
    if (keyword !== "") {
      const list = context.countryList.filter((item) =>
        item.country.toLowerCase().includes(keyword)
      );
      setCountryList(list);
    } else {
      setCountryList(context.countryList);
    }
  };

  return (
    <>
      <Button className='countryDrop d-flex align-items-center justify-content-between' onClick={() => setisOpenModal(true)}>
        <span className='name font-weight-bold text-truncate text-left mr-2' title={context.selectedCountry}>
          {context.selectedCountry || "Select Location"}
        </span>
        <span className='arrowIcon ml-auto d-flex align-items-center'><FaAngleDown /></span>
      </Button>

      <Dialog
        open={isOpenModal}
        onClose={() => setisOpenModal(false)}
        className='locationModal'
        TransitionComponent={Transition}
        maxWidth="xs"
        fullWidth
      >
        <div className="locationModalContent p-4 position-relative">
          <h5 className='font-weight-bold mb-1 pr-4'>Choose your Delivery Location</h5>
          <p className="text-muted small mb-3">Specify your location for delivery rates and regional offers.</p>
          <Button
            className="close_ position-absolute"
            onClick={() => setisOpenModal(false)}
            style={{ top: 12, right: 12, minWidth: 36, width: 36, height: 36, borderRadius: '50%' }}
          >
            <MdClose size={20} />
          </Button>

          <div className='headerSearch w-100 mb-3'>
            <input type='text' placeholder='Search your area or city...' onChange={filterList} />
            <Button><IoIosSearch /></Button>
          </div>

          <ul className="countryList list-unstyled mb-0 mt-2">
            {countryList?.length !== 0 ? (
              countryList.map((item, index) => (
                <li key={index} className="mb-1">
                  <Button
                    onClick={() => selectCountry(index, item.country)}
                    className={`w-100 justify-content-start text-capitalize font-weight-bold py-2 px-3 rounded text-left ${
                      context.selectedCountry === item.country ? 'bg-primary text-white' : 'text-dark hover-light'
                    }`}
                  >
                    📍 {item.country}
                  </Button>
                </li>
              ))
            ) : (
              <li className="p-3 text-center text-muted small">No locations found</li>
            )}
          </ul>
        </div>
      </Dialog>
    </>
  );
};

export default CountryDropdown;