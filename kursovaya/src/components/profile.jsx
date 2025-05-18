import axios from 'axios'
import {Link} from 'react-router-dom'
import './main/main.css'
import imgBooks from './main/books.jpg'
import imgAuthors from './main/authors.jpg'
import Search from './main/search'
import Comments from './main/comments';


function Prof(){
    return(
        <>
        <div className = "result">
            <Search/>
        </div>
        <div className = "b_o">
            <Link className = "booking" to={'booking'} className = "table--order">
               <div className = "order">
                   <h2 className = "h2--order">Бронирование</h2>
               </div>
            </Link>
            <Link className = "order" to={'order'} className = "table--order">
               <div className = "order">
                   <h2 className = "h2--order">Заказы</h2>
               </div>
            </Link>
        </div>
        <div className = "main_tab">
           <Link className = "table" to={'books_table'}>
               <div className = "books">
                 <div className='img_div'>
                     <img className='img' src={imgBooks} alt="books" />
                 </div>
                 <h2 className = "h2">Книги</h2>
               </div>
            </Link>
        </div>
        <Comments/>
        </>
        )
}
export default Prof